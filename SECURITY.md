# Security policy

Do not open a public issue containing credentials, private customer data, or a
working exploit. Use GitHub's private vulnerability reporting for this
repository when available, or email [licensing@wippy.ai](mailto:licensing@wippy.ai).
The latest release is supported. See the
[organization security policy](https://github.com/kicksideai/.github/blob/main/SECURITY.md) for reporting details.

When validating a derived module:

- run `make verify`;
- inspect the Git diff and tracked-file list;
- keep Hub tokens, provider keys, `.env`, `.wippy/`, databases, and module packs
  outside Git;
- use least-privilege endpoint policies and authenticated routers;
- validate untrusted input at the contract/API boundary;
- parameterize SQL and avoid logging private payloads.

The test PostgreSQL credentials in `compose.test.yaml` are disposable local
fixtures and must never be reused in a deployment.
