(() => {
    const dialogElement = document.querySelector('.dialog');
    const nextElement = document.querySelector('.dialog_next');
    const portraitElement = document.querySelector('.tachie img');
    let typingTimer = null;
    let currentStory = [];
    let currentIndex = 0;
    let currentText = '';
    let visibleCharacters = 0;
    let isTyping = false;
    let audioContext = null;
    let activeQuestionPromise = null;
    let dialogCompletionPromise = null;
    let resolveDialogCompletion = null;

    if (typeof window.dialogTypingInterval !== 'number') {
        window.dialogTypingInterval = 50;
    }

    if (typeof window.dialogTypingSoundEnabled !== 'boolean') {
        window.dialogTypingSoundEnabled = true;
    }

    const activateAudio = () => {
        if (!audioContext || audioContext.state === 'closed') {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) {
                return;
            }
            audioContext = new AudioContext();
        }

        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    };

    const playTypingSound = () => {
        if (!window.dialogTypingSoundEnabled) {
            return;
        }

        activateAudio();
        if (!audioContext || audioContext.state !== 'running') {
            return;
        }

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const now = audioContext.currentTime;

        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(420, now);
        gain.gain.setValueAtTime(0.020, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.045);
    };

    const stopTyping = () => {
        if (typingTimer !== null) {
            clearTimeout(typingTimer);
            typingTimer = null;
        }
        isTyping = false;
    };

    const updateNextIndicator = () => {
        nextElement.style.visibility = isTyping || currentIndex >= currentStory.length - 1
            ? 'hidden'
            : 'visible';
    };

    const isMaskOpen = () => {
        const mask = document.querySelector('.mask');

        if (!mask) {
            return false;
        }

        const style = getComputedStyle(mask);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    };

    const getVisibleCharacters = (text) => Array.from(text)
        .filter((character) => character !== '【' && character !== '】');

    const renderDialogText = (text, visibleCount) => {
        const fragment = document.createDocumentFragment();
        let highlighted = false;
        let characterCount = 0;
        let textBuffer = '';

        const flushBuffer = () => {
            if (!textBuffer) {
                return;
            }

            const node = highlighted
                ? document.createElement('span')
                : document.createTextNode(textBuffer);
            if (highlighted) {
                node.className = 'dialog-highlight';
                node.textContent = textBuffer;
            }
            fragment.appendChild(node);
            textBuffer = '';
        };

        for (const character of Array.from(text)) {
            if (character === '【') {
                flushBuffer();
                highlighted = true;
                continue;
            }

            if (character === '】') {
                flushBuffer();
                highlighted = false;
                continue;
            }

            if (characterCount >= visibleCount) {
                break;
            }

            textBuffer += character;
            characterCount += 1;
        }

        flushBuffer();
        dialogElement.replaceChildren(fragment);
    };

    window.askQuestion = (question) => {
        const mask = document.querySelector('.mask');
        const title = mask && mask.querySelector('.title');
        const input = mask && mask.querySelector('.input');
        const submit = mask && mask.querySelector('.submit');

        if (!mask || !title || !input || !submit) {
            return Promise.reject(new Error('Question mask elements are missing.'));
        }

        if (activeQuestionPromise) {
            return activeQuestionPromise;
        }

        const questionText = String(question ?? '');
        const titleTextNode = title.firstChild;
        if (titleTextNode && titleTextNode.nodeType === Node.TEXT_NODE) {
            titleTextNode.nodeValue = questionText;
        } else {
            title.textContent = questionText;
        }

        mask.style.display = '';
        mask.removeAttribute('aria-hidden');
        input.value = '';

        activeQuestionPromise = new Promise((resolve) => {
            submit.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                input.blur();
                mask.style.display = 'none';
                mask.setAttribute('aria-hidden', 'true');
                activeQuestionPromise = null;
                resolve(input.value);
            }, { once: true });
        });

        const entrance = typeof window.enterMask === 'function'
            ? window.enterMask()
            : Promise.resolve();
        Promise.resolve(entrance).then(() => {
            input.focus({ preventScroll: true });
        });

        return activeQuestionPromise;
    };

    const showCharacters = () => {
        const characters = getVisibleCharacters(currentText);
        visibleCharacters += 1;
        renderDialogText(currentText, visibleCharacters);
        if (visibleCharacters % 2 === 0) {
            playTypingSound();
        }

        if (visibleCharacters < characters.length) {
            const interval = Math.max(0, window.dialogTypingInterval);
            typingTimer = setTimeout(showCharacters, interval);
            return;
        }

        stopTyping();
        updateNextIndicator();
    };

    const showLine = (index) => {
        stopTyping();
        currentIndex = index;
        const face = String(currentStory[currentIndex].face || '').trim();
        const content = String(currentStory[currentIndex].content || '');
        currentText = content.replaceAll('[username]', String(window.username ?? ''));
        visibleCharacters = 0;
        isTyping = true;
        dialogElement.textContent = '';
        if (portraitElement && face) {
            portraitElement.src = `img/${face}.png`;
        }
        updateNextIndicator();
        showCharacters();
    };

    const advanceDialog = () => {
        if (!currentStory.length) {
            return;
        }

        if (isTyping) {
            stopTyping();
            visibleCharacters = getVisibleCharacters(currentText).length;
            renderDialogText(currentText, visibleCharacters);
            updateNextIndicator();
            return;
        }

        if (currentIndex < currentStory.length - 1) {
            showLine(currentIndex + 1);
            return;
        }

        if (resolveDialogCompletion) {
            resolveDialogCompletion();
            resolveDialogCompletion = null;
        }
    };

    window.startDialog = (storyId) => {
        const stories = typeof dialog !== 'undefined' ? dialog : null;
        const story = stories && stories[storyId];

        if (!dialogElement || !nextElement || !Array.isArray(story) || story.length === 0) {
            return false;
        }

        currentStory = story;
        dialogCompletionPromise = new Promise((resolve) => {
            resolveDialogCompletion = resolve;
        });
        showLine(0);
        return true;
    };

    window.waitForDialog = () => dialogCompletionPromise || Promise.resolve();

    document.addEventListener('click', () => {
        if (isMaskOpen()) {
            return;
        }

        activateAudio();
        advanceDialog();
    });
    document.addEventListener('keydown', (event) => {
        if (event.code === 'Space') {
            event.preventDefault();

            if (isMaskOpen()) {
                return;
            }

            activateAudio();
            advanceDialog();
        }
    });


})();

(async () => {
    window.startDialog('1-1');
    await window.waitForDialog();

    while (true) {
        let username = await window.askQuestion('お名前');
        if (username.length < 1) {
            window.startDialog('1-2a');

            await window.waitForDialog();
        } else {

            window.username = username;
            break;
        }
    }
    window.startDialog('1-2');
})();
