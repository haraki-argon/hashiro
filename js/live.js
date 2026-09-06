(() => {
    const timeElement = document.querySelector('.panel .bottom p span');
    const powerElement = document.querySelector('.panel .power');
    const powerBar = powerElement && powerElement.querySelector('.ins');
    const leftElement = document.querySelector('.panel .left');
    const powerStep = 5;
    const naturalPowerInterval = 6000;

    if (!timeElement || !powerBar || !leftElement) {
        return;
    }

    const clampPower = (value) => Math.min(100, Math.max(0, Number(value) || 0));

    const updatePower = () => {
        window.power = clampPower(window.power);
        powerBar.style.width = `${window.power}%`;
        powerBar.setAttribute('aria-valuenow', String(window.power));
    };

    window.setPower = (value) => {
        window.power = clampPower(value);
        updatePower();
        return window.power;
    };

    window.addPower = (value) => window.setPower(window.power + value);

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
    updatePower();
    window.setInterval(updateTime, 1000);
    window.setInterval(() => window.addPower(1), naturalPowerInterval);
    leftElement.addEventListener('click', () => window.addPower(powerStep));
})();
