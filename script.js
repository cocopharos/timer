document.addEventListener('DOMContentLoaded', () => {
    // --- UI要素 ---
    const timeDisplay = document.getElementById('time-display');
    const inputGroup = document.getElementById('input-group');
    const minInput = document.getElementById('minutes-input');
    const secInput = document.getElementById('seconds-input');
    
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const resetBtn = document.getElementById('reset-btn');
    const testSoundBtn = document.getElementById('test-sound-btn');
    
    const progressCircle = document.getElementById('progress-circle');

    // --- 状態変数 ---
    let timerId = null;
    let isRunning = false;
    let totalSeconds = 25 * 60;
    let remainingSeconds = totalSeconds;
    
    // SVGプログレスリングの設定
    const radius = progressCircle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    progressCircle.style.strokeDashoffset = 0;

    function setProgress(percent) {
        const offset = circumference - percent / 100 * circumference;
        progressCircle.style.strokeDashoffset = offset;
    }

    // --- 時間のフォーマット ---
    function formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    // --- 表示の更新 ---
    function updateDisplay() {
        timeDisplay.textContent = formatTime(remainingSeconds);
        const percent = totalSeconds > 0 ? (remainingSeconds / totalSeconds) * 100 : 0;
        setProgress(percent);
    }

    // --- 入力値から時間を更新 ---
    function readInputs() {
        let m = parseInt(minInput.value) || 0;
        let s = parseInt(secInput.value) || 0;
        
        // 正規化 (例: 1分90秒 -> 2分30秒)
        m += Math.floor(s / 60);
        s = s % 60;
        
        minInput.value = m;
        secInput.value = s.toString().padStart(2, '0');
        
        totalSeconds = m * 60 + s;
        remainingSeconds = totalSeconds;
        updateDisplay();
    }

    // --- タイマー処理 ---
    function tick() {
        if (remainingSeconds > 0) {
            remainingSeconds--;
            updateDisplay();
        } else {
            // タイマー終了
            stopTimer();
            playHealingSound();
        }
    }

    function startTimer() {
        if (!isRunning) {
            // まだ始まっていない場合は入力を反映
            if (timerId === null && remainingSeconds === totalSeconds) {
                readInputs();
            }
            if (totalSeconds <= 0) return;

            isRunning = true;
            inputGroup.classList.remove('active');
            timeDisplay.classList.remove('hidden');
            
            startBtn.classList.add('hidden');
            stopBtn.classList.remove('hidden');
            
            timerId = setInterval(tick, 1000);
        }
    }

    function stopTimer() {
        if (isRunning) {
            isRunning = false;
            clearInterval(timerId);
            startBtn.classList.remove('hidden');
            stopBtn.classList.add('hidden');
            // 一時停止状態を示すテキスト変更などがあればここへ
            startBtn.textContent = 'Resume';
        }
    }

    function resetTimer() {
        stopTimer();
        timerId = null;
        startBtn.textContent = 'Start';
        
        inputGroup.classList.add('active');
        timeDisplay.classList.add('hidden');
        
        readInputs(); // 入力状態に合わせて表示をリセット
        setProgress(100);
    }

    // --- Web Audio API を用いた癒やしの音 (シンギングボウル風) ---
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    function playHealingSound() {
        // もしサスペンド状態ならレジューム
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const now = audioCtx.currentTime;

        // 複数のオシレーターを組み合わせて深みのある音を作成
        const createTone = (freq, type, attack, decay, gainValue, delay) => {
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            osc.type = type;
            osc.frequency.setValueAtTime(freq, now + delay);
            
            // エンベロープ (音の立ち上がりと消え方)
            gainNode.gain.setValueAtTime(0, now + delay);
            // 余韻を持たせた柔らかい立ち上がり
            gainNode.gain.linearRampToValueAtTime(gainValue, now + delay + attack);
            // 長い余韻
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + attack + decay);

            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            osc.start(now + delay);
            osc.stop(now + delay + attack + decay + 0.1);
        };

        // ベース音 (深みのあるサイン波)
        createTone(220, 'sine', 0.5, 5.0, 0.4, 0);       // A3
        createTone(223, 'sine', 0.5, 4.5, 0.2, 0);       // わずかに出音させてコーラス効果（うなり）

        // 倍音 (明るさをブレンド)
        createTone(440, 'sine', 0.6, 4.0, 0.15, 0.1);    // A4
        createTone(660, 'sine', 0.8, 3.0, 0.05, 0.2);    // E5
        createTone(880, 'sine', 1.0, 2.0, 0.02, 0.3);    // A5
        
        // やわらかいベルのようなアタック音
        createTone(440, 'triangle', 0.05, 1.5, 0.1, 0); 

        // 2回目の鳴動 (少し間を空けて)
        setTimeout(() => {
            createTone(220, 'sine', 0.5, 4.0, 0.3, 0);
            createTone(440, 'sine', 0.6, 3.0, 0.1, 0.1);
        }, 3000); // 3秒後にもう一度優しく鳴らす
    }

    // --- イベントリスナー ---
    startBtn.addEventListener('click', startTimer);
    stopBtn.addEventListener('click', stopTimer);
    resetBtn.addEventListener('click', resetTimer);
    testSoundBtn.addEventListener('click', () => {
        playHealingSound();
    });

    // 入力欄の変更を監視
    [minInput, secInput].forEach(input => {
        input.addEventListener('change', readInputs);
    });

    // 初期化
    resetTimer(); // 最初は入力モードにする
});
