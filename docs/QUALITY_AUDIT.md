# Public site quality audit

Measured on the original folder interface packaged for GitHub Pages.

| Size | Improvement | Result |
| --- | --- | --- |
| Small | Remove colored language badge containers | Course and folder logos display as standalone SVGs; Rust is visible on dark backgrounds. |
| Small | Fix share card and quiz controls | SVG download uses the browser; the quiz button starts another round of the saved questions. |
| Small | Keep practice drafts | Code is stored locally between visits. |
| Medium | Package prepared lessons | All 116 available roadmap lessons are present at their topic URLs. 41 C++ and Rust topics remain to be written. |
| Medium | Restore full practice set | 20 challenges load from repository content, including 8 Hard problems. |
| Medium | Contain user code | Practice tests run in a sandboxed frame with network blocked and a three second execution limit. |
| Medium | Make feedback honest | Lessons offer self review guidance; automatic grading is not claimed without a grader. |
| Large | Accounts and live Grok | Firebase and server route code exist in `apps/web`; the public static site still needs Firebase project configuration and a server deployment for these services. |

Validation: content validator reports 116 lessons and 20 challenges with zero errors or warnings. The browser smoke check loads a Python lesson and logo, passes a correct challenge solution, and stops an infinite loop. Client-side challenge tests are inspectable; a secure competition judge requires a server.
