/**
 * Simulador de Memória Virtual - Paginação por Demanda
 * Implementa algoritmos FIFO, Optimal e Clock
 */

// Estado global da simulação
let state = {
    sequence: [],
    numFrames: 3,
    allocation: 'global',
    memory: [],
    pageFaults: 0,
    pageHits: 0,
    currentStep: 0,
    log: [],
    isRunning: false,
    isPaused: false,
    timer: null,
    algorithm: 'fifo',
    pageTable: new Map(),
    algorithms: {
        fifo: { data: [] },
        clock: { pointer: 0, referenceBits: [] }
    }
};

// Elementos DOM
const elements = {
    pageSequence: document.getElementById('pageSequence'),
    numFrames: document.getElementById('numFrames'),
    algorithm: document.getElementById('algorithm'),
    allocation: document.getElementById('allocation'),
    startBtn: document.getElementById('startBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    resetBtn: document.getElementById('resetBtn'),
    stepBtn: document.getElementById('stepBtn'),
    speedSlider: document.getElementById('speedSlider'),
    speedValue: document.getElementById('speedValue'),
    memoryView: document.getElementById('memoryView'),
    simulationLog: document.getElementById('simulationLog'),
    totalAccesses: document.getElementById('totalAccesses'),
    pageFaults: document.getElementById('pageFaults'),
    pageHits: document.getElementById('pageHits'),
    faultRate: document.getElementById('faultRate'),
    currentPageDisplay: document.getElementById('currentPageDisplay'),
    pageTable: document.getElementById('pageTable')
};

/**
 * Inicialização da aplicação
 */
function init() {
    setupEventListeners();
    setDefaultValues();
    updateAll();
}

/**
 * Configura os event listeners
 */
function setupEventListeners() {
    elements.startBtn.addEventListener('click', handleStart);
    elements.pauseBtn.addEventListener('click', pause);
    elements.resetBtn.addEventListener('click', reset);
    elements.stepBtn.addEventListener('click', step);
    elements.speedSlider.addEventListener('input', updateSpeed);
}

/**
 * Define valores padrão
 */
function setDefaultValues() {
    elements.pageSequence.value = '1,2,3,4,1,2,5,1,2,3,4,5';
    updateSpeed();
    updateMemoryView();
}

/**
 * Validação de entrada
 */
function validateInput() {
    const sequenceInput = elements.pageSequence.value.trim();
    if (!sequenceInput) {
        alert('Por favor, insira uma sequência de páginas.');
        return false;
    }

    const sequence = sequenceInput.split(/[\s,]+/).filter(Boolean);
    if (sequence.some(isNaN) || sequence.length === 0) {
        alert('Sequência inválida. Use apenas números separados por vírgula ou espaço.');
        return false;
    }

    const frames = parseInt(elements.numFrames.value);
    if (isNaN(frames) || frames < 1) {
        alert('Número de frames deve ser um número positivo.');
        return false;
    }

    return true;
}

/**
 * Controle principal da simulação
 */
function handleStart() {
    if (!validateInput()) return;

    if (state.isPaused) {
        resume();
    } else {
        start();
    }
}

function start() {
    initializeState();
    run();
}

function initializeState() {
    // Configurações da simulação
    state.sequence = elements.pageSequence.value
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number);
    
    state.numFrames = parseInt(elements.numFrames.value);
    state.algorithm = elements.algorithm.value;
    state.allocation = elements.allocation.value;
    
    // Reset do estado
    state.memory = new Array(state.numFrames);
    state.pageFaults = 0;
    state.pageHits = 0;
    state.currentStep = 0;
    state.log = [];
    state.isRunning = true;
    state.isPaused = false;
    state.pageTable = new Map();

    // Reset dos algoritmos
    resetAlgorithmData();
    
    // Inicialização
    initializePageTable();
    updateAll();
    logInitialMessages();
}

function resetAlgorithmData() {
    state.algorithms.fifo.data = [];
    state.algorithms.clock.pointer = 0;
    state.algorithms.clock.referenceBits = [];
}

function initializePageTable() {
    const uniquePages = [...new Set(state.sequence)];
    uniquePages.forEach(page => {
        state.pageTable.set(page, { present: false, frame: -1 });
    });
}

function logInitialMessages() {
    logMessage(`🚀 Iniciando simulação com ${state.algorithm.toUpperCase()}`);
    logMessage(`📊 Sequência: [${state.sequence.join(', ')}]`);
    logMessage(`💾 Frames disponíveis: ${state.numFrames}`);
    logMessage(`🔧 Alocação: ${state.allocation === 'global' ? 'Global (pool único)' : 'Local (frames fixos)'}`);
}

function run() {
    if (!state.isRunning || state.isPaused || isComplete()) {
        if (isComplete()) {
            finish();
        }
        return;
    }

    step();
    const speed = parseInt(elements.speedSlider.value);
    state.timer = setTimeout(run, speed);
}

/**
 * Executa um passo da simulação
 */
function step() {
    if (isComplete()) {
        finish();
        return;
    }

    const currentPage = state.sequence[state.currentStep];
    elements.currentPageDisplay.textContent = currentPage;

    logMessage(`\n--- Passo ${state.currentStep + 1} ---`);
    logMessage(`🔍 Acessando página: ${currentPage}`);

    const result = executeAlgorithm(currentPage);
    processResult(result, currentPage);

    state.currentStep++;
    updateAll();

    if (isComplete()) {
        setTimeout(finish, 500);
    }
}

/**
 * Executa o algoritmo selecionado
 */
function executeAlgorithm(page) {
    switch (state.algorithm) {
        case 'fifo':
            return fifoAlgorithm(page);
        case 'optimal':
            return optimalAlgorithm(page);
        case 'clock':
            return clockAlgorithm(page);
        default:
            return fifoAlgorithm(page);
    }
}

function processResult(result, currentPage) {
    if (result.hit) {
        state.pageHits++;
        logMessage(`✅ HIT - Página ${currentPage} já está na memória`);
    } else {
        state.pageFaults++;
        if (result.replaced) {
            logMessage(`❌ FAULT - Página ${result.replaced} substituída por ${currentPage}`);
        } else {
            logMessage(`❌ FAULT - Página ${currentPage} carregada em frame vazio`);
        }
    }

    logMessage(`💾 Memória: [${getMemoryState()}]`);
    updateMemoryView(result.replaced, currentPage, result.hit);
}

/**
 * Algoritmos de substituição de páginas
 */

// FIFO (First In, First Out)
function fifoAlgorithm(page) {
    const pageEntry = state.pageTable.get(page);
    if (pageEntry && pageEntry.present) {
        return { hit: true, replaced: null };
    }

    const emptyIndex = findEmptyFrame();
    if (emptyIndex !== -1) {
        state.memory[emptyIndex] = page;
        state.algorithms.fifo.data.push({ page, frameIndex: emptyIndex });
        updatePageTable(page, true, emptyIndex);
        return { hit: false, replaced: null };
    }

    // Substituição FIFO
    const oldestEntry = state.algorithms.fifo.data.shift();
    const frameIndex = oldestEntry.frameIndex;
    const replacedPage = state.memory[frameIndex];

    state.memory[frameIndex] = page;
    state.algorithms.fifo.data.push({ page, frameIndex });
    updatePageTable(replacedPage, false, -1);
    updatePageTable(page, true, frameIndex);

    return { hit: false, replaced: replacedPage };
}

// Optimal (Belady's Algorithm)
function optimalAlgorithm(page) {
    const pageEntry = state.pageTable.get(page);
    if (pageEntry && pageEntry.present) {
        return { hit: true, replaced: null };
    }

    const emptyIndex = findEmptyFrame();
    if (emptyIndex !== -1) {
        state.memory[emptyIndex] = page;
        updatePageTable(page, true, emptyIndex);
        return { hit: false, replaced: null };
    }

    // Encontrar a página que será usada mais tarde (ou nunca)
    let farthest = -1;
    let replaceIndex = 0;

    for (let i = 0; i < state.numFrames; i++) {
        if (state.memory[i] === undefined) continue;

        let nextUse = state.sequence.length;
        for (let j = state.currentStep + 1; j < state.sequence.length; j++) {
            if (state.sequence[j] === state.memory[i]) {
                nextUse = j;
                break;
            }
        }

        if (nextUse > farthest) {
            farthest = nextUse;
            replaceIndex = i;
        }
    }

    const replacedPage = state.memory[replaceIndex];
    state.memory[replaceIndex] = page;
    updatePageTable(replacedPage, false, -1);
    updatePageTable(page, true, replaceIndex);

    return { hit: false, replaced: replacedPage };
}

// Clock (Second-Chance Algorithm)
function clockAlgorithm(page) {
    const pageEntry = state.pageTable.get(page);
    if (pageEntry && pageEntry.present) {
        const index = state.memory.indexOf(page);
        if (index !== -1) state.algorithms.clock.referenceBits[index] = 1;
        return { hit: true, replaced: null };
    }

    const emptyIndex = findEmptyFrame();
    if (emptyIndex !== -1) {
        state.memory[emptyIndex] = page;
        while (state.algorithms.clock.referenceBits.length <= emptyIndex) {
            state.algorithms.clock.referenceBits.push(0);
        }
        state.algorithms.clock.referenceBits[emptyIndex] = 1;
        updatePageTable(page, true, emptyIndex);
        return { hit: false, replaced: null };
    }

    // Procurar por uma página com bit de referência 0
    let attempts = 0;
    while (state.algorithms.clock.referenceBits[state.algorithms.clock.pointer] === 1 && attempts < state.numFrames) {
        state.algorithms.clock.referenceBits[state.algorithms.clock.pointer] = 0;
        state.algorithms.clock.pointer = (state.algorithms.clock.pointer + 1) % state.numFrames;
        attempts++;
    }

    const replacedPage = state.memory[state.algorithms.clock.pointer];
    state.memory[state.algorithms.clock.pointer] = page;
    state.algorithms.clock.referenceBits[state.algorithms.clock.pointer] = 1;

    if (replacedPage !== undefined) {
        updatePageTable(replacedPage, false, -1);
    }
    updatePageTable(page, true, state.algorithms.clock.pointer);

    state.algorithms.clock.pointer = (state.algorithms.clock.pointer + 1) % state.numFrames;

    return { hit: false, replaced: replacedPage };
}

/**
 * Controles de simulação
 */
function pause() {
    state.isPaused = true;
    state.isRunning = false;
    clearTimer();
    updateButtons();
    logMessage(`⏸️ Simulação pausada`);
}

function resume() {
    state.isPaused = false;
    state.isRunning = true;
    updateButtons();
    logMessage(`▶️ Simulação retomada`);
    run();
}

function reset() {
    state.isRunning = false;
    state.isPaused = false;
    clearTimer();

    // Reset completo do estado
    state.memory = new Array(state.numFrames);
    state.pageFaults = 0;
    state.pageHits = 0;
    state.currentStep = 0;
    state.log = [];
    state.pageTable = new Map();

    resetAlgorithmData();

    elements.currentPageDisplay.textContent = '-';
    elements.simulationLog.textContent = 'Pronto para iniciar simulação...';
    updateAll();
}

function finish() {
    state.isRunning = false;
    state.isPaused = false;

    logMessage(`\n🏁 SIMULAÇÃO FINALIZADA!`);
    logMessage(`📊 Resultados:`);
    logMessage(`   • Total de acessos: ${state.currentStep}`);
    logMessage(`   • Page faults: ${state.pageFaults}`);
    logMessage(`   • Page hits: ${state.pageHits}`);
    logMessage(`   • Taxa de falhas: ${getFaultRate()}%`);

    elements.currentPageDisplay.textContent = '-';
    updateButtons();
    clearTimer();
}

/**
 * Funções auxiliares
 */
function findEmptyFrame() {
    for (let i = 0; i < state.numFrames; i++) {
        if (state.memory[i] === undefined) {
            return i;
        }
    }
    return -1;
}

function updatePageTable(page, present, frame) {
    state.pageTable.set(page, { present, frame });
}

function isComplete() {
    return state.currentStep >= state.sequence.length;
}

function clearTimer() {
    if (state.timer) {
        clearTimeout(state.timer);
        state.timer = null;
    }
}

function getMemoryState() {
    return state.memory.map(page => page !== undefined ? page : '-').join(', ');
}

function getFaultRate() {
    return state.currentStep > 0 
        ? ((state.pageFaults / state.currentStep) * 100).toFixed(1) 
        : '0';
}

function logMessage(message) {
    state.log.push(message);
    elements.simulationLog.textContent = state.log.join('\n');
    elements.simulationLog.scrollTop = elements.simulationLog.scrollHeight;
}

/**
 * Atualização da interface
 */
function updateAll() {
    updateButtons();
    updateStats();
    updatePageTableView();
}

function updateButtons() {
    elements.startBtn.disabled = state.isRunning && !state.isPaused;
    elements.pauseBtn.disabled = !state.isRunning;
    elements.stepBtn.disabled = state.isRunning && !state.isPaused;

    elements.startBtn.textContent = state.isPaused ? '▶️ Continuar' : '🚀 Iniciar';
}

function updateSpeed() {
    const speed = elements.speedSlider.value;
    elements.speedValue.textContent = speed + 'ms';
}

function updateStats() {
    elements.totalAccesses.textContent = state.currentStep;
    elements.pageFaults.textContent = state.pageFaults;
    elements.pageHits.textContent = state.pageHits;
    elements.faultRate.textContent = getFaultRate() + '%';
}

function updateMemoryView(replaced = null, newPage = null, isHit = false) {
    elements.memoryView.innerHTML = '';

    for (let i = 0; i < state.numFrames; i++) {
        const frame = document.createElement('div');
        frame.className = 'frame';

        if (state.memory[i] !== undefined) {
            frame.textContent = state.memory[i];

            // Efeitos visuais baseados no tipo de acesso
            if (isHit && state.memory[i] === newPage) {
                // Page hit - pisca verde
                frame.classList.add('page-hit');
            } else if (!isHit && state.memory[i] === newPage) {
                // Page fault - nova página ou substituição
                if (replaced) {
                    frame.classList.add('replaced');
                } else {
                    frame.classList.add('new-page');
                }
            }
        } else {
            frame.textContent = '-';
            frame.classList.add('empty');
        }

        elements.memoryView.appendChild(frame);
    }

    // Informações específicas do algoritmo Clock
    updateClockInfo();
}

function updateClockInfo() {
    const memoryInfo = document.getElementById('memoryInfo');
    
    if (state.algorithm === 'clock' && state.algorithms.clock.referenceBits.length > 0) {
        const info = `Ponteiro: ${state.algorithms.clock.pointer} | Bits R: [${state.algorithms.clock.referenceBits.join(', ')}]`;
        memoryInfo.innerHTML = `<small>${info}</small>`;
    } else {
        memoryInfo.innerHTML = '';
    }
}

function updatePageTableView() {
    if (state.sequence.length === 0) return;

    const uniquePages = [...new Set(state.sequence)].sort((a, b) => a - b);
    let html = '<div class="page-table-header">Página</div><div class="page-table-header">Presente</div><div class="page-table-header">Frame</div>';

    uniquePages.forEach(page => {
        const entry = state.pageTable.get(page) || { present: false, frame: -1 };

        html += `<div class="page-table-cell">${page}</div>`;

        if (entry.present) {
            html += '<div class="page-table-cell present">✓ SIM</div>';
            html += `<div class="page-table-cell present">${entry.frame}</div>`;
        } else {
            html += '<div class="page-table-cell not-present">✗ NÃO</div>';
            html += '<div class="page-table-cell not-present">-</div>';
        }
    });

    elements.pageTable.innerHTML = html;
}

/**
 * Inicialização quando o DOM estiver carregado
 */
document.addEventListener('DOMContentLoaded', init);
