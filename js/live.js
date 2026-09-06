(() => {
    const timeElement = document.querySelector('.panel .bottom p span');

    if (!timeElement) {
        return;
    }

    const pad = (value) => String(value).padStart(2, '0');

    const updateTime = () => {
        const now = new Date();
        const time = [
            `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`,
            `${pad(now.getHours())}:${pad(now.getMinutes())}`
        ].join(' ');

        timeElement.textContent = time;
    };

    updateTime();
    window.setInterval(updateTime, 1000);
})();
