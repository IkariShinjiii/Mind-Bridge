import { z } from "zod";

// Zod 4 probes `new Function` at first use to enable its JIT compiler. A strict Content Security Policy
// (no 'unsafe-eval') reports that probe as a violation even though Zod swallows the error. Our schemas validate
// short forms, so the JIT buys nothing; turning it off keeps the app compatible with an enforced CSP.
z.config({ jitless: true });
