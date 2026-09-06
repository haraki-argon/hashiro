(() => {
    const dialogElement = document.querySelector('.dialog');
    const nextElement = document.querySelector('.dialog_next');
    const rightElement = document.querySelector('.panel .right');
    const portraitElement = document.querySelector('.tachie img');
    let typingTimer = null;
    let currentStory = [];
    let currentIndex = 0;
    let currentText = '';
    let visibleCharacters = 0;
    let isTyping = false;
    let currentFace = 'normal';
    let audioContext = null;
    let activeQuestionPromise = null;
    let activeChoicePromise = null;
    let powerFullPromise = null;
    let dialogCompletionPromise = null;
    let resolveDialogCompletion = null;

    if (typeof window.dialogTypingInterval !== 'number') {
        window.dialogTypingInterval = 50;
    }

    if (typeof window.dialogTypingSoundEnabled !== 'boolean') {
        window.dialogTypingSoundEnabled = true;
    }

    const typingSoundProfiles = {
        normal: { frequency: 420 },
        warai: { frequency: 480 },
        fear: { frequency: 320 }
    };

    window.dialogTypingSoundProfiles = typingSoundProfiles;

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

        const profile = typingSoundProfiles[currentFace] || typingSoundProfiles.normal;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const now = audioContext.currentTime;

        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(profile.frequency, now);
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
        return Array.from(document.querySelectorAll('.mask, .choice-mask')).some((mask) => {
            const style = getComputedStyle(mask);
            return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        });
    };

    window.waitForPowerFull = () => {
        if (Number(window.power) >= 100) {
            return Promise.resolve(100);
        }

        if (powerFullPromise) {
            return powerFullPromise;
        }

        powerFullPromise = new Promise((resolve) => {
            const powerTimer = window.setInterval(() => {
                if (Number(window.power) < 100) {
                    return;
                }

                window.clearInterval(powerTimer);
                powerFullPromise = null;
                resolve(100);
            }, 100);
        });

        return powerFullPromise;
    };

    window.askChoice = (question, options) => {
        const choiceMask = document.querySelector('.choice-mask');
        const title = choiceMask && choiceMask.querySelector('.choice-title');
        const list = choiceMask && choiceMask.querySelector('.choice-list');
        const submit = choiceMask && choiceMask.querySelector('.choice-submit');

        if (!choiceMask || !title || !list || !submit || !Array.isArray(options) || options.length === 0) {
            return Promise.reject(new Error('Choice mask elements or options are missing.'));
        }

        if (activeChoicePromise) {
            return activeChoicePromise;
        }

        const normalizedOptions = options.map((option, index) => {
            if (option && typeof option === 'object') {
                return {
                    label: String(option.label ?? option.text ?? option.value ?? ''),
                    value: option.value ?? option.label ?? option.text ?? index
                };
            }

            return { label: String(option), value: option };
        });

        title.textContent = String(question ?? '');
        list.replaceChildren();
        choiceMask.style.display = '';
        choiceMask.removeAttribute('aria-hidden');

        activeChoicePromise = new Promise((resolve) => {
            let onKeyDown;
            let selectedOption = null;
            const finishChoice = () => {
                if (!selectedOption) {
                    return;
                }

                document.removeEventListener('keydown', onKeyDown);
                document.activeElement?.blur();
                choiceMask.style.display = 'none';
                choiceMask.setAttribute('aria-hidden', 'true');
                activeChoicePromise = null;
                resolve(selectedOption.value);
            };

            submit.disabled = true;
            submit.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                finishChoice();
            }, { once: true });

            normalizedOptions.forEach((option, index) => {
                const optionShell = document.createElement('div');
                optionShell.className = 'choice-option-shell';
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'choice-option';
                button.dataset.index = String(index);
                button.setAttribute('role', 'option');
                button.innerHTML = `<span class="choice-number">0${index + 1}</span><span class="choice-label"></span>`;
                button.querySelector('.choice-label').textContent = option.label;
                button.setAttribute('aria-selected', 'false');
                button.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    selectedOption = option;
                    list.querySelectorAll('.choice-option').forEach((choiceButton) => {
                        choiceButton.classList.remove('is-selected');
                        choiceButton.setAttribute('aria-selected', 'false');
                    });
                    button.classList.add('is-selected');
                    button.setAttribute('aria-selected', 'true');
                    submit.disabled = false;
                });
                optionShell.appendChild(button);
                list.appendChild(optionShell);
            });

            onKeyDown = (event) => {
                const index = Number(event.key) - 1;
                if (index < 0 || index >= normalizedOptions.length) {
                    return;
                }
                event.preventDefault();
                const button = list.children[index];
                button.click();
                document.removeEventListener('keydown', onKeyDown);
            };
            document.addEventListener('keydown', onKeyDown);
        });

        const entrance = typeof window.enterChoiceMask === 'function'
            ? window.enterChoiceMask()
            : Promise.resolve();
        Promise.resolve(entrance).then(() => {
            list.querySelector('.choice-option')?.focus({ preventScroll: true });
        });

        return activeChoicePromise;
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
        currentFace = face || 'normal';
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

    const handleDialogClick = () => {
        if (isMaskOpen()) {
            return;
        }

        activateAudio();
        advanceDialog();
    };

    dialogElement.addEventListener('click', handleDialogClick);
    nextElement.addEventListener('click', handleDialogClick);
    rightElement?.addEventListener('click', handleDialogClick);

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
    await window.waitForDialog();

    let nextStory = await window.askChoice('どうしますか？', [
        { label: 'いいよ', value: '1-3' },
        { label: '考えさせて...', value: '1-3a' }
    ]);

    window.startDialog(nextStory);
    if (nextStory === '1-3a') {
        await window.waitForDialog();
        let nextStory = await window.askChoice('お願いします！', [
            { label: 'わかりました。', value: '1-3' },
            { label: 'すみません...', value: '1-3b' }
        ]);
        window.startDialog(nextStory);
    }

    await window.waitForPowerFull();
    window.setPower(0);
    window.startDialog('2-1');
    await window.waitForDialog();
})();
