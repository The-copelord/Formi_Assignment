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
type ParserState = 'TEXT' | 'INLINE_CODE' | 'CODE_BLOCK';
let state: ParserState = 'TEXT';
let activeElement: HTMLElement | null = null; // The element we are currently appending to (span, pre, or root)

// Trackers for detecting transitions
let inlineOpenBackticks = 0;
let blockCloseBackticks = 0;

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

    // FIX: Force the container to respect newlines
    if (currentContainer.style.whiteSpace !== 'pre-wrap') {
        currentContainer.style.whiteSpace = 'pre-wrap';
        currentContainer.style.fontFamily = 'sans-serif'; // optional: makes text cleaner
    }

    for (const char of token) {
        processChar(char);
    }
}

function processChar(char: string) {
    if (state === 'TEXT') {
        handleTextState(char);
    } else if (state === 'INLINE_CODE') {
        handleInlineCodeState(char);
    } else if (state === 'CODE_BLOCK') {
        handleCodeBlockState(char);
    }
}

function handleTextState(char: string) {
    if (char === '`') {
        startInlineCode();
    } else {
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

function appendTextToActive(text: string) {
    if (!activeElement) activeElement = currentContainer;
    activeElement?.appendChild(document.createTextNode(text));
}

function startInlineCode() {
    const span = document.createElement('span');
    applyInlineStyles(span);
    currentContainer!.appendChild(span);
    activeElement = span;
    state = 'INLINE_CODE';
    inlineOpenBackticks = 1;
}

function closeInlineCode() {
    activeElement = currentContainer;
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
    activeElement = currentContainer;
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