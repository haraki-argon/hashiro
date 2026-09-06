(() => {
    const maskMotion = {
        '.query': { x: -120, y: 50, scale: 1.08, rotate: -7 },
        '.title': { x: -110, y: -20, scale: 0.72, rotate: -16 },
        '.input': { x: 90, y: 18, scale: 0.82, rotate: 13 },
        '.submit': { x: 0, y: 80, scale: 0.55, rotate: 8 }
    };

    const entranceMotion = {
        '.tachie': { x: 70, y: -18, scale: 0.94 },
        '.left': { x: -90, y: 0, scale: 0.98 },
        '.right': { x: 90, y: 0, scale: 0.98 },
        '.name': { x: 22, y: 28, scale: 0.82 },
        '.status': { x: 0, y: -20, scale: 0.9 },
        '.dialog': { x: -18, y: 24, scale: 0.96 },
        '.dialog_next': { x: 12, y: 18, scale: 0.7 },
        '.pulse': { x: 0, y: 90, scale: 0.96 },
        '.bottom': { x: 0, y: 55, scale: 0.98 }
    };

    const entranceTransform = (motion) => [
        { transform: `translate3d(${motion.x}px, ${motion.y}px, 0) scale(${motion.scale}) rotate(${motion.rotate || 0}deg)` },
        { transform: 'translate3d(0, 0, 0) scale(1)' }
    ];

    const animateElements = (root, motionMap, duration, delayStep) => {
        const elements = Object.entries(motionMap)
            .map(([selector, motion]) => [root.querySelector(selector), motion])
            .filter(([element]) => element);

        const animations = elements.flatMap(([element, motion], index) => {
            const timing = {
                duration,
                delay: 90 + index * delayStep,
                easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
                fill: 'both'
            };

            return [
                element.animate(entranceTransform(motion), {
                    ...timing,
                    composite: 'add'
                }),
                element.animate([
                    { opacity: 0 },
                    { opacity: 1 }
                ], timing)
            ];
        });

        return animations;
    };

    window.enterMask = () => {
        const mask = document.querySelector('.mask');

        if (!mask || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return Promise.resolve();
        }

        if (mask.__entranceAnimations) {
            mask.__entranceAnimations.forEach((animation) => animation.cancel());
        }

        const animations = animateElements(mask, maskMotion, 900, 105);
        mask.__entranceAnimations = animations;

        return Promise.all(animations.map((animation) => animation.finished))
            .then(() => {
                animations.forEach((animation) => animation.cancel());
                mask.__entranceAnimations = null;
            });
    };

    window.enterPanel = () => {
        const panel = document.querySelector('.panel');

        if (!panel) {
            return Promise.resolve();
        }

        if (panel.__entranceAnimations) {
            panel.__entranceAnimations.forEach((animation) => animation.cancel());
        }

        const elements = Object.entries(entranceMotion)
            .map(([selector, motion]) => [panel.querySelector(selector), motion])
            .filter(([element]) => element);

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return Promise.resolve();
        }

        const animations = elements.flatMap(([element, motion], index) => {
            const timing = {
                duration: 760,
                delay: 80 + index * 75,
                easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
                fill: 'both'
            };

            const transformAnimation = element.animate(entranceTransform(motion), {
                ...timing,
                composite: 'add'
            });

            const opacityAnimation = element.animate([
                { opacity: 0 },
                { opacity: 1 }
            ], timing);

            return [transformAnimation, opacityAnimation];
        });

        panel.__entranceAnimations = animations;

        return Promise.all(animations.map((animation) => animation.finished))
            .then(() => {
                animations.forEach((animation) => animation.cancel());
                panel.__entranceAnimations = null;
            });
    };
})();

enterPanel();
enterMask();