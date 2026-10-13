-- kickside.data:writable sink that persists each written item and logs it to
-- the runtime console.
local logger = require("logger")
local repo = require("repo")

local log = logger:named("starter.log")

local function fail(code, message, retriable, scope)
    return {
        success = false,
        error = {
            code = code,
            message = tostring(message),
            retriable = retriable == true,
            scope = scope or "item",
        },
    }
end

local function write(req)
    req = type(req) == "table" and req or {}
    local config = type(req.config) == "table" and req.config or {}
    local input = type(req.input) == "table" and req.input or {}

    local origin = type(req.origin) == "string" and req.origin or ""
    if origin:match("^%s*$") then return fail("invalid_request", "origin is required", false) end
    local key = type(req.idempotency_key) == "string" and req.idempotency_key or ""
    if key:match("^%s*$") then return fail("invalid_request", "idempotency_key is required", false) end

    local sink_op = type(req.sink_op) == "string" and req.sink_op or "upsert"
    if sink_op ~= "upsert" then return fail("invalid_request", "unsupported sink operation: " .. sink_op, false) end

    local content = input.content
    if content == nil or content == "" then return fail("invalid_request", "write requires input.content", false) end

    local label = config.label
    if type(label) ~= "string" or label == "" then label = "LOG" end

    local delivery, err = repo.deliver(label, tostring(content), origin, sink_op, key)
    if err then return fail("provider_unavailable", err, true, "flow") end

    if delivery.conflict then return fail("conflict", "delivery key is bound to different content or label", false) end
    if delivery.created then
        log:info("log write", { label = label, id = delivery.id })
    end
    return { success = true, result = "created", dest_ref = { id = delivery.id, label = delivery.label } }
end

return { write = write }
