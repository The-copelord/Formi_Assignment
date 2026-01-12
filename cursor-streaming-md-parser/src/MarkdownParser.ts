const blogpostMarkdown = `# control

*humans should focus on bigger problems*

## Setup

\`\`\`bash
git clone git@github.com:anysphere/control
\`\`\`

\`\`\`bash
./init.sh
\`\`\`

## Folder structure

**The most important folders are:**

1. \`vscode\`: this is our fork of vscode, as a submodule.
2. \`milvus\`: this is where our Rust server code lives.
3. \`schema\`: this is our Protobuf definitions for communication between the client and the server.

Each of the above folders should contain fairly comprehensive README files; please read them. If something is missing, or not working, please add it to the README!

Some less important folders:

1. \`release\`: this is a collection of scripts and guides for releasing various things.
2. \`infra\`: infrastructure definitions for the on-prem deployment.
3. \`third_party\`: where we keep our vendored third party dependencies.

## Miscellaneous things that may or may not be useful

##### Where to find rust-proto definitions

They are in a file called \`aiserver.v1.rs\`. It might not be clear where that file is. Run \`rg --files --no-ignore bazel-out | rg aiserver.v1.rs\` to find the file.

## Releasing

Within \`vscode/\`:

- Bump the version
- Then:

\`\`\`
git checkout build-todesktop
git merge main
git push origin build-todesktop
\`\`\`

- Wait for 14 minutes for gulp and ~30 minutes for todesktop
- Go to todesktop.com, test the build locally and hit release
`;
//Parsing State Globals
type ParserState = 'TEXT' | 'INLINE_CODE' | 'CODE_BLOCK' | 'BOLD' | 'HEADING';;
let state: ParserState = 'TEXT';
let activeElement: HTMLElement | null = null; // The element we are currently appending to (span, pre, or root)

// Trackers for detecting transitions
let inlineOpenBackticks = 0;
let blockCloseBackticks = 0;
let pendingAsterisk = false;
let isStartOfLine = true;
let currentContainer: HTMLElement | null = null;
// Do not edit this method
function runStream() {
    currentContainer = document.getElementById('markdownContainer')!;

    // this randomly split the markdown into tokens between 2 and 20 characters long
    // simulates the behavior of an ml model thats giving you weirdly chunked tokens
    const tokens: string[] = [];
    let remainingMarkdown = blogpostMarkdown;
    while (remainingMarkdown.length > 0) {
        const tokenLength = Math.floor(Math.random() * 18) + 2;
        const token = remainingMarkdown.slice(0, tokenLength);
        tokens.push(token);
        remainingMarkdown = remainingMarkdown.slice(tokenLength);
    }

    const toCancel = setInterval(() => {
        const token = tokens.shift();
        if (token) {
            addToken(token);
        } else {
            clearInterval(toCancel);
        }
    }, 20);
}


/* 
Please edit the addToken method to support at least inline codeblocks and codeblocks. Feel free to add any other methods you need.
This starter code does token streaming with no styling right now. Your job is to write the parsing logic to make the styling work.

Note: don't be afraid of using globals for state. For this challenge, speed is preferred over cleanliness.
 */
function addToken(token: string) {
    if (!currentContainer) return;

    // Force pre-wrap to handle newlines correctly
    if (currentContainer.style.whiteSpace !== 'pre-wrap') {
        currentContainer.style.whiteSpace = 'pre-wrap';
        currentContainer.style.fontFamily = 'system-ui, sans-serif';
        currentContainer.style.lineHeight = '1.5';
    }

    for (const char of token) {
        processChar(char);
    }
}

function processChar(char: string) {
    // Universal check for newlines to reset "Start of Line" status
    // But we process the char first based on state

    if (state === 'TEXT') {
        handleTextState(char);
    } else if (state === 'INLINE_CODE') {
        handleInlineCodeState(char);
    } else if (state === 'CODE_BLOCK') {
        handleCodeBlockState(char);
    } else if (state === 'BOLD') {
        handleBoldState(char);
    } else if (state === 'HEADING') {
        handleHeadingState(char);
    }

    // Update line tracker
    if (char === '\n') {
        isStartOfLine = true;
    } else {
        isStartOfLine = false;
    }
}

// --- State Handlers ---

function handleTextState(char: string) {
    // 1. Check for Code (` or ```)
    if (char === '`') {
        startInlineCode();
        return;
    }

    // 2. Check for Headings (#)
    // Only valid if we are at the start of a line
    if (isStartOfLine && char === '#') {
        startHeading();
        return;
    }

    // 3. Check for Bold (**)
    if (char === '*') {
        if (pendingAsterisk) {
            // We saw one * before, now we see another. That's ** -> Bold!
            startBold();
            pendingAsterisk = false;
        } else {
            // This is the first *. Wait for next char.
            pendingAsterisk = true;
        }
        return;
    }

    // If we had a pending asterisk but this char is NOT '*', it was just a literal * (or italic)
    // For now, we just print the * we skipped and then the current char
    if (pendingAsterisk) {
        appendTextToActive('*');
        pendingAsterisk = false;
    }

    appendTextToActive(char);
}

function handleHeadingState(char: string) {
    if (char === '\n') {
        // Newline ends the heading
        closeHeading();
        // We also need to process the newline to ensure the next line starts fresh
        appendTextToActive('\n');
        isStartOfLine = true;
    } else {
        appendTextToActive(char);
    }
}

function handleBoldState(char: string) {
    if (char === '*') {
        if (pendingAsterisk) {
            // We saw one * inside bold, now another. That's ** -> Close Bold!
            closeBold();
            pendingAsterisk = false;
        } else {
            pendingAsterisk = true;
        }
    } else {
        if (pendingAsterisk) {
            appendTextToActive('*');
            pendingAsterisk = false;
        }
        appendTextToActive(char);
    }
}

function handleInlineCodeState(char: string) {
    if (char === '`') {
        const isCurrentlyEmpty = activeElement && activeElement.textContent === '';

        if (isCurrentlyEmpty && inlineOpenBackticks < 3) {
            inlineOpenBackticks++;
            if (inlineOpenBackticks === 3) {
                upgradeInlineToBlock();
            }
        } else {
            closeInlineCode();
        }
    } else {
        appendTextToActive(char);
    }
}

function handleCodeBlockState(char: string) {
    if (char === '`') {
        appendTextToActive(char);
        blockCloseBackticks++;
        if (blockCloseBackticks === 3) {
            closeCodeBlock();
        }
    } else {
        blockCloseBackticks = 0;
        appendTextToActive(char);
    }
}

// --- DOM Manipulation Helpers ---

function appendTextToActive(text: string) {
    // If we are in TEXT state, we write to root. 
    // If in Bold/Heading/Code, we write to that element.
    const target = activeElement || currentContainer!;
    target.appendChild(document.createTextNode(text));
}

function startHeading() {
    // We don't know the level (h1, h2) yet because the user might type `#` then `#`.
    // But for simplicity/speed, let's optimistically assume H1, and we can't easily change tags in DOM.
    // Hack: Just style a div or span to look like a header, or make a generic 'h2' for everything.
    // Better Hack: Parse the `#` count inside the handler? 
    // Simplest approach for this challenge: Just make it an H2 immediately.

    const h2 = document.createElement('h2');
    h2.style.margin = '1em 0 0.5em 0';
    h2.style.borderBottom = '1px solid #444';
    h2.style.paddingBottom = '0.3em';

    // The first '#' is already consumed by the logic, but if there are more, they will be appended as text.
    // To make it look perfect we'd need to buffer, but this is "Fast over Clean".

    currentContainer!.appendChild(h2);
    activeElement = h2;
    state = 'HEADING';
}

function closeHeading() {
    // Remove trailing # if they exist (optional cleanup)
    activeElement = null; // Return to root
    state = 'TEXT';
}

function startBold() {
    const strong = document.createElement('strong');
    strong.style.color = '#fff'; // Make it pop slightly more

    // If we are nested (e.g. inside a header), we append to activeElement.
    // If we are at root, we append to currentContainer.
    const parent = activeElement || currentContainer!;
    parent.appendChild(strong);

    // NEW ACTIVE ELEMENT IS THE BOLD TAG
    // We need a stack to support nesting properly, but for 1-level depth:
    // If we were in text, activeElement was null. Now it's strong.
    // If we were in Header, activeElement was H2. Now it needs to be Strong.
    // Limitation: This simple parser logic assumes flat structure for simplicity.
    // We will force activeElement to be the strong tag.
    activeElement = strong;
    state = 'BOLD';
}

function closeBold() {
    // When closing bold, we need to return to the PARENT.
    // Since we don't have a stack, we guess:
    // If parent of strong is currentContainer, active -> null.
    // If parent is H2, active -> H2.

    if (activeElement && activeElement.parentElement !== currentContainer) {
        activeElement = activeElement.parentElement as HTMLElement;
    } else {
        activeElement = null;
    }
    state = 'TEXT';
}

// --- Previous Code Helpers (Unchanged) ---

function startInlineCode() {
    const span = document.createElement('span');
    applyInlineStyles(span);
    currentContainer!.appendChild(span);
    activeElement = span;
    state = 'INLINE_CODE';
    inlineOpenBackticks = 1;
}

function closeInlineCode() {
    activeElement = null;
    state = 'TEXT';
    inlineOpenBackticks = 0;
}

function upgradeInlineToBlock() {
    if (activeElement && activeElement.parentNode) {
        activeElement.parentNode.removeChild(activeElement);
    }
    const pre = document.createElement('pre');
    applyBlockStyles(pre);
    currentContainer!.appendChild(pre);
    activeElement = pre;
    state = 'CODE_BLOCK';
    inlineOpenBackticks = 0;
    blockCloseBackticks = 0;
}

function closeCodeBlock() {
    if (activeElement) {
        const text = activeElement.textContent || '';
        if (text.endsWith('```')) {
            activeElement.textContent = text.substring(0, text.length - 3);
        }
    }
    activeElement = null;
    state = 'TEXT';
    blockCloseBackticks = 0;
}

function applyInlineStyles(el: HTMLElement) {
    el.style.backgroundColor = '#f2f2f2';
    el.style.color = '#e01e5a';
    el.style.padding = '2px 4px';
    el.style.borderRadius = '4px';
    el.style.fontFamily = 'monospace';
}

function applyBlockStyles(el: HTMLElement) {
    el.style.display = 'block';
    el.style.backgroundColor = '#1e1e1e';
    el.style.color = '#d4d4d4';
    el.style.padding = '12px';
    el.style.borderRadius = '6px';
    el.style.fontFamily = 'monospace';
    el.style.whiteSpace = 'pre-wrap';
    el.style.margin = '1em 0';
}