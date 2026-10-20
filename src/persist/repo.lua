-- Log entry rows. One row per acknowledged write.
local sql = require("sql")
local registry = require("registry")
local uuid = require("uuid")
local contract = require("contract")

-- The target_db requirement writes the host database resource ID here.
local DB_CONFIG = "acme.starter.persist:db_config"

local repo = {}

local function notify_changed()
    local definition, definition_err = contract.get("kickside.contract:realtime")
    if definition_err then return definition_err end
    if not definition then return "realtime contract is unavailable" end
    local realtime, open_err = definition:open()
    if open_err then return open_err end
    if not realtime then return "realtime binding is unavailable" end
    local result, broadcast_err = realtime:broadcast({ topic = "acme.starter.changed", data = {} })
    if broadcast_err then return broadcast_err end
    if type(result) ~= "table" or result.success ~= true then
        return "starter notification refused: " .. tostring(type(result) == "table" and result.error or "no result")
    end
    return nil
end

function repo.db_id(): (string?, error?)
    local entry, err = registry.get(DB_CONFIG)
    if err then return nil, err end
    local db_id = entry and entry.meta and entry.meta.db_id
    if type(db_id) ~= "string" or db_id == "" then
        return nil, errors.new({
            message = DB_CONFIG .. " has no db_id; bind the target_db requirement",
            kind = errors.INVALID,
            retryable = false,
        })
    end
    return db_id, nil
end

local function with_db(fn)
    local db_id, id_err = repo.db_id()
    if not db_id then return nil, id_err end
    local db, err = sql.get(db_id)
    if err then return nil, err end
    local result, rerr = fn(db)
    db:release()
    return result, rerr
end

-- Insert one log entry. Returns the generated row id.
function repo.insert(label, content)
    local id, err = with_db(function(db)
        local id = uuid.v7()
        local _, err = db:execute(
            "INSERT INTO acme_starter_log_entries (id, label, content) VALUES ($1, $2, $3)",
            { id, label, content })
        if err then return nil, err end
        return id
    end)
    if err then return nil, err end
    local notify_err = notify_changed()
    if notify_err then return nil, notify_err end
    return id
end

function repo.deliver(label, content, origin, sink_op, key)
    local delivery, err = with_db(function(db)
        local rows, insert_err = db:query([[
            INSERT INTO acme_starter_log_entries (id, label, content, origin, sink_op, idempotency_key)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (origin, sink_op, idempotency_key) DO NOTHING
            RETURNING id, label
        ]], { uuid.v7(), label, content, origin, sink_op, key })
        if insert_err then return nil, insert_err end
        if rows and rows[1] then
            return { id = rows[1].id, label = rows[1].label, created = true }
        end
        local stored, read_err = db:query([[
            SELECT id, label, content FROM acme_starter_log_entries
            WHERE origin = $1 AND sink_op = $2 AND idempotency_key = $3
        ]], { origin, sink_op, key })
        if read_err then return nil, read_err end
        local row = stored and stored[1]
        if not row then return nil, "durable delivery is missing" end
        if row.label ~= label or row.content ~= content then
            return { conflict = true }
        end
        return { id = row.id, label = row.label, created = false }
    end)
    if err then return nil, err end
    if not delivery.conflict then
        local notify_err = notify_changed()
        if notify_err then return nil, notify_err end
    end
    return delivery
end

-- Number of log entries written so far.
function repo.count()
    return with_db(function(db)
        local rows, err = db:query("SELECT COUNT(*) AS n FROM acme_starter_log_entries", {})
        if err then return nil, err end
        local row = rows and rows[1]
        return tonumber(row and (row.n or row["COUNT(*)"])) or 0
    end)
end

return repo
