local process = require("process")
local security = require("security")
local repo = require("repo")

local M = {}

function M.notify()
    return { success = false, error = "starter status uses a shared topic" }
end

function M.broadcast(args)
    if not security.can("realtime.broadcast", "kickside.realtime:" .. args.topic) then
        return { success = false, error = "access denied" }
    end
    local observer = process.registry.lookup("starter.notifications")
    if observer then
        local count, count_err = repo.count()
        if count_err then return nil, count_err end
        local _, send_err = process.send(observer, "starter.notification", {
            topic = args.topic, data = args.data, count = count,
        })
        if send_err then return nil, send_err end
    end
    return { success = true }
end

return M
