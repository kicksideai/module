-- Lifecycle test for the starter log sink: the port is published, the write
-- persists a row and acknowledges per the kickside.data:writable ABI.
local test = require("test")
local funcs = require("funcs")
local registry = require("registry")
local security = require("security")
local repo = require("repo")
local channel = require("channel")
local time = require("time")

local WRITE_ID = "acme.starter.sink:write"
local SINK_ID = "acme.starter:log_sink"
local PORT_ID = "acme.starter:log"
local BLOCK_FN_ID = "acme.starter.blocks:block_write_log"

local function executor(actor_id)
    return funcs.new():with_actor(security.new_actor(actor_id, {}))
end

local function count_rows(): number
    local count, err = repo.count()
    test.is_nil(err)
    assert(type(count) == "number", "row count must be a number")
    return count
end

local function define_tests()
    test.describe("acme.starter log sink", function()
        test.it("publishes the log port bound to the writable sink", function()
            local entry, err = registry.get(PORT_ID)
            test.is_nil(err)
            test.not_nil(entry, PORT_ID .. " is missing")

            local sink, sink_err = registry.get(SINK_ID)
            test.is_nil(sink_err)
            test.not_nil(sink, SINK_ID .. " is missing")
        end)

        test.it("acknowledges a write and stamps the configured label", function()
            local res, err = executor("starter-test-user"):call(WRITE_ID, {
                origin = "starter-test-sync",
                sink_op = "upsert",
                idempotency_key = "starter-t-1",
                config = { label = "TEST" },
                input = { content = "hello from the lifecycle test" },
            })
            test.is_nil(err)
            test.not_nil(res)
            test.is_true(res.success, "write did not acknowledge")
            test.eq(res.result, "created")
            test.eq(res.dest_ref.label, "TEST")
            test.not_nil(res.dest_ref.id, "created result must carry the row id")
        end)

        test.it("persists one row per acknowledged write", function()
            local before = count_rows()

            local res, err = executor("starter-test-user"):call(WRITE_ID, {
                origin = "starter-test-sync",
                sink_op = "upsert",
                idempotency_key = "starter-t-2",
                input = { content = "row persisted by the suite" },
            })
            test.is_nil(err)
            test.is_true(res.success, "write did not acknowledge")

            local after = count_rows()
            test.eq(after, before + 1, "write must insert exactly one row")
        end)

        test.it("rejects a write without content", function()
            local res, err = executor("starter-test-user"):call(WRITE_ID, {
                origin = "starter-test-sync",
                sink_op = "upsert",
                input = {},
            })
            test.is_nil(err)
            test.eq(res.success, false)
            test.is_nil(res.result, "failure envelope must not carry result")
            test.not_nil(res.error)
            test.eq(res.error.scope, "item")
            test.eq(res.error.retriable, false)
        end)

        test.it("refuses absent origins and delivery keys before persisting", function()
            local before = count_rows()
            for _, origin in ipairs({ false, "", "   " }) do
                local res, err = executor("starter-test-user"):call(WRITE_ID, {
                    origin = origin, sink_op = "upsert", idempotency_key = "anonymous",
                    input = { content = "anonymous" },
                })
                test.is_nil(err)
                test.eq(res.success, false)
                test.eq(res.error.code, "invalid_request")
                test.eq(res.error.retriable, false)
            end
            local res, err = executor("starter-test-user"):call(WRITE_ID, {
                origin = "starter-test-sync", sink_op = "upsert", input = { content = "unkeyed" },
            })
            test.is_nil(err)
            test.eq(res.success, false)
            test.eq(res.error.code, "invalid_request")
            local after = count_rows()
            test.eq(after, before)
        end)

        test.it("replays one durable effect with its original destination", function()
            local before = count_rows()
            local request = { origin = "starter-replay-sync", sink_op = "upsert", idempotency_key = "retry",
                config = { label = "REPLAY" }, input = { content = "one effect" } }
            local first, first_err = executor("starter-test-user"):call(WRITE_ID, request)
            test.is_nil(first_err)
            test.is_true(first.success)
            local replay, replay_err = executor("starter-test-user"):call(WRITE_ID, request)
            test.is_nil(replay_err)
            test.is_true(replay.success)
            test.eq(replay.result, first.result)
            test.eq(replay.dest_ref.id, first.dest_ref.id)
            test.eq(replay.dest_ref.label, first.dest_ref.label)
            local after = count_rows()
            test.eq(after, before + 1)
        end)

        test.it("refuses a changed content or label under a durable delivery key", function()
            local request = { origin = "starter-bound-sync", sink_op = "upsert", idempotency_key = "bound",
                config = { label = "ORIGINAL" }, input = { content = "original" } }
            local first, first_err = executor("starter-test-user"):call(WRITE_ID, request)
            test.is_nil(first_err)
            test.is_true(first.success)
            local before = count_rows()
            for _, changed in ipairs({
                { config = { label = "ORIGINAL" }, input = { content = "changed" } },
                { config = { label = "CHANGED" }, input = { content = "original" } },
            }) do
                changed.origin = request.origin
                changed.sink_op = request.sink_op
                changed.idempotency_key = request.idempotency_key
                local res, err = executor("starter-test-user"):call(WRITE_ID, changed)
                test.is_nil(err)
                test.eq(res.success, false)
                test.eq(res.error.code, "conflict")
                test.eq(res.error.retriable, false)
            end
            local after = count_rows()
            test.eq(after, before)
        end)

        test.it("keeps the same key independent across writing origins", function()
            local before = count_rows()
            local ids = {}
            for _, origin in ipairs({ "starter-origin-one", "starter-origin-two" }) do
                local res, err = executor("starter-test-user"):call(WRITE_ID, {
                    origin = origin, sink_op = "upsert", idempotency_key = "shared",
                    input = { content = "same key" },
                })
                test.is_nil(err)
                test.is_true(res.success)
                ids[#ids + 1] = res.dest_ref.id
            end
            test.is_true(ids[1] ~= ids[2])
            local after = count_rows()
            test.eq(after, before + 2)
        end)

        test.it("deduplicates concurrent retries in durable storage", function()
            local before = count_rows()
            local pending = {}
            for i = 1, 2 do
                local cmd, err = executor("starter-test-user"):async(WRITE_ID, {
                    origin = "starter-concurrent-sync", sink_op = "upsert", idempotency_key = "race",
                    input = { content = "concurrent" },
                })
                test.is_nil(err)
                pending[#pending + 1] = cmd
            end
            local ids = {}
            for _, cmd in ipairs(pending) do
                local selected = channel.select({ cmd:response():case_receive(), time.after("60s"):case_receive() })
                test.not_nil(selected.value, "concurrent delivery does not answer")
                local payload, err = cmd:result()
                test.is_nil(err)
                local result = payload:data()
                test.is_true(result.success)
                ids[#ids + 1] = result.dest_ref.id
            end
            test.eq(ids[1], ids[2])
            local after = count_rows()
            test.eq(after, before + 1)
        end)

        test.it("applies one concurrent payload and refuses the divergent retry", function()
            local before = count_rows()
            local pending = {}
            for _, content in ipairs({ "first payload", "second payload" }) do
                local cmd, err = executor("starter-test-user"):async(WRITE_ID, {
                    origin = "starter-divergent-sync", sink_op = "upsert", idempotency_key = "divergent-race",
                    input = { content = content },
                })
                test.is_nil(err)
                pending[#pending + 1] = cmd
            end
            local applied, refused = 0, 0
            for _, cmd in ipairs(pending) do
                local selected = channel.select({ cmd:response():case_receive(), time.after("60s"):case_receive() })
                test.not_nil(selected.value, "concurrent delivery does not answer")
                local payload, err = cmd:result()
                test.is_nil(err)
                local result = payload:data()
                if result.success then
                    applied = applied + 1
                else
                    test.eq(result.error.code, "conflict")
                    test.eq(result.error.retriable, false)
                    refused = refused + 1
                end
            end
            test.eq(applied, 1)
            test.eq(refused, 1)
            local after = count_rows()
            test.eq(after, before + 1)
        end)

        test.it("executes the write-log Block and returns its persisted result", function()
            local before = count_rows()

            local res, err = executor("starter-test-user"):call(BLOCK_FN_ID, {
                input = { content = "hello from the Block" },
                config = { default_label = "BLOCK" },
            })
            test.is_nil(err)
            test.not_nil(res)
            test.not_nil(res.entry_id)
            test.eq(res.label, "BLOCK")
            test.eq(res.count, before + 1)

            local after = count_rows()
            test.eq(after, before + 1)
        end)
    end)
end

local run_cases = test.run_cases(define_tests)
return { run = function(options) return run_cases(options) end }
