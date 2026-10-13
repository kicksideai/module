return require("migration").define(function()
    migration("Create acme_starter_log_entries table", function()
        database("postgres", function()
            up(function(db)
                local _, err = db:execute([[
                    CREATE TABLE acme_starter_log_entries (
                        id UUID PRIMARY KEY,
                        label TEXT NOT NULL,
                        content TEXT NOT NULL,
                        origin TEXT,
                        sink_op TEXT,
                        idempotency_key TEXT,
                        created_at TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
                        UNIQUE (origin, sink_op, idempotency_key)
                    );
                ]])
                if err then error("Failed to create acme_starter_log_entries: " .. err) end
            end)
            down(function(db) db:execute("DROP TABLE acme_starter_log_entries") end)
        end)
        database("sqlite", function()
            up(function(db)
                local _, err = db:execute([[
                    CREATE TABLE acme_starter_log_entries (
                        id TEXT PRIMARY KEY,
                        label TEXT NOT NULL,
                        content TEXT NOT NULL,
                        origin TEXT,
                        sink_op TEXT,
                        idempotency_key TEXT,
                        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
                        UNIQUE (origin, sink_op, idempotency_key)
                    )
                ]])
                if err then error("Failed to create acme_starter_log_entries: " .. err) end
            end)
            down(function(db) db:execute("DROP TABLE acme_starter_log_entries") end)
        end)
    end)
end)
