// js/simulator.js
// Estado global do simulador
const simulator = {
    frames: [],
    pageSequence: [],
    processSequence: [], 
    currentStep: 0,
    algorithm: 'fifo',
    mode: 'global',
    stats: {
        accesses: 0,
        faults: 0,
        hits: 0
    },
    processStats: {},
    isPlaying: false,
    playInterval: null,
    
    fifoQueue: [],
    fifoQueueByProcess: {}, 
    
    clockPointer: 0,
    clockPointerByProcess: {}, 
    referenceBits: [],
    
    lruCounter: 0,
    lastUsed: [],
    
    futureUses: [],
    
    processes: [],
    processAllocation: {}, 
    frameOwnership: {} 
};

// Classe para representar um Frame
class Frame {
    constructor(id) {
        this.id = id;
        this.pageId = null;
        this.processId = null;
        this.loadTime = null;
        this.lastAccess = null;
        this.referenceBit = 0;
    }

    load(pageId, processId = 0) {
        this.pageId = pageId;
        this.processId = processId;
        this.loadTime = Date.now();
        this.lastAccess = simulator.lruCounter++;
        this.referenceBit = 1;
    }

    clear() {
        this.pageId = null;
        this.processId = null;
        this.loadTime = null;
        this.lastAccess = null;
        this.referenceBit = 0;
    }

    access() {
        this.lastAccess = simulator.lruCounter++;
        this.referenceBit = 1;
    }
}

// Inicializar simulação
function startSimulation() {
    resetSimulation();
    
    const numFrames = parseInt(document.getElementById('numFrames').value);
    simulator.algorithm = document.getElementById('algorithm').value;
    simulator.mode = document.getElementById('allocationMode').value;
    
    const sequenceInput = document.getElementById('pageSequence').value;
    parsePageAndProcessSequence(sequenceInput);
    
    simulator.stats = {
        accesses: 0,
        faults: 0,
        hits: 0
    };
    
    simulator.frames = [];
    for (let i = 0; i < numFrames; i++) {
        simulator.frames.push(new Frame(i));
    }
    
    if (simulator.mode === 'local') {
        setupLocalModeProcesses(numFrames);
    }
    
    if (simulator.algorithm === 'optimal') {
        prepareOptimalData();
    }
    
    simulator.fifoQueue = [];
    simulator.referenceBits = new Array(numFrames).fill(0);
    simulator.lastUsed = new Array(numFrames).fill(-1);
    simulator.lruCounter = 0;
    simulator.clockPointer = 0;
    
    if (simulator.mode === 'local') {
        simulator.processes.forEach(pid => {
            simulator.fifoQueueByProcess[pid] = [];
            simulator.clockPointerByProcess[pid] = 0;
            simulator.processStats[pid] = {
                accesses: 0,
                faults: 0,
                hits: 0
            };
        });
    }
    
    updateStats();
    updateMemoryDisplay();
    updateSequenceDisplay();
    enableControls(true);
    
    logEvent('Simulação iniciada', 'info');
    logEvent(`Algoritmo: ${simulator.algorithm.toUpperCase()}, Modo: ${simulator.mode}, Frames: ${numFrames}`, 'info');
    
    if (simulator.mode === 'local') {
        logEvent(`Processos: ${simulator.processes.length}, Alocação: ${JSON.stringify(simulator.processAllocation)}`, 'info');
    }
}

// Executar próximo passo
function stepSimulation() {
    if (simulator.currentStep >= simulator.pageSequence.length) {
        finishSimulation();
        return;
    }
    
    const page = simulator.pageSequence[simulator.currentStep];
    const process = simulator.processSequence[simulator.currentStep];
    const result = accessPage(page, process);
    
    simulator.currentStep++;
    
    updateMemoryDisplay();
    updateSequenceDisplay();
    updateStats();
    updateStepInfo(page, result, process);
    
    if (simulator.currentStep >= simulator.pageSequence.length) {
        finishSimulation();
    }
}

// Acessar página
function accessPage(pageId, processId = 0) {
    simulator.stats.accesses++;
    
    if (simulator.mode === 'local' && simulator.processStats[processId]) {
        simulator.processStats[processId].accesses++;
    }
    
    // No modo local, procurar apenas nos frames do processo
    let frameIndex = -1;
    if (simulator.mode === 'local') {
        const processFrames = simulator.processAllocation[processId] || [];
        for (const fIndex of processFrames) {
            if (simulator.frames[fIndex].pageId === pageId && 
                simulator.frames[fIndex].processId === processId) {
                frameIndex = fIndex;
                break;
            }
        }
    } else {
        frameIndex = simulator.frames.findIndex(f => f.pageId === pageId);
    }
    
    if (frameIndex !== -1) {
        simulator.stats.hits++;
        if (simulator.mode === 'local' && simulator.processStats[processId]) {
            simulator.processStats[processId].hits++;
        }
        
        simulator.frames[frameIndex].access();
        
        if (simulator.algorithm === 'clock') {
            simulator.referenceBits[frameIndex] = 1;
        }
        
        logEvent(`Page Hit: P${processId}:${pageId} encontrada no frame ${frameIndex}`, 'success');
        return { type: 'hit', frame: frameIndex, process: processId };
    } else {
        simulator.stats.faults++;
        if (simulator.mode === 'local' && simulator.processStats[processId]) {
            simulator.processStats[processId].faults++;
        }
        
        const replacedFrame = handlePageFault(pageId, processId);
        
        logEvent(`Page Fault: P${processId}:${pageId} carregada no frame ${replacedFrame}`, 'error');
        return { type: 'fault', frame: replacedFrame, process: processId };
    }
}

// Tratar Page Fault
function handlePageFault(pageId, processId = 0) {
    let candidateFrames = [];
    
    if (simulator.mode === 'local') {
        candidateFrames = simulator.processAllocation[processId] || [];
    } else {
        candidateFrames = simulator.frames.map((_, i) => i);
    }
    
    let emptyFrame = -1;
    for (const fIndex of candidateFrames) {
        if (simulator.frames[fIndex].pageId === null) {
            emptyFrame = fIndex;
            break;
        }
    }
    
    if (emptyFrame !== -1) {
        simulator.frames[emptyFrame].load(pageId, processId);
        
        if (simulator.algorithm === 'fifo') {
            if (simulator.mode === 'local') {
                if (!simulator.fifoQueueByProcess[processId]) {
                    simulator.fifoQueueByProcess[processId] = [];
                }
                simulator.fifoQueueByProcess[processId].push(emptyFrame);
            } else {
                simulator.fifoQueue.push(emptyFrame);
            }
        }
        
        return emptyFrame;
    }
    
    let victimFrame;
    
    if (simulator.mode === 'local') {
        switch (simulator.algorithm) {
            case 'fifo':
                victimFrame = algorithmFIFOLocal(processId);
                break;
            case 'optimal':
                victimFrame = algorithmOptimalLocal(processId, candidateFrames);
                break;
            case 'clock':
                victimFrame = algorithmClockLocal(processId, candidateFrames);
                break;
            case 'lru':
                victimFrame = algorithmLRULocal(candidateFrames);
                break;
            default:
                victimFrame = candidateFrames[0];
        }
    } else {
        switch (simulator.algorithm) {
            case 'fifo':
                victimFrame = algorithmFIFO();
                break;
            case 'optimal':
                victimFrame = algorithmOptimal();
                break;
            case 'clock':
                victimFrame = algorithmClock();
                break;
            case 'lru':
                victimFrame = algorithmLRU();
                break;
            default:
                victimFrame = 0;
        }
    }
    
    const oldPage = simulator.frames[victimFrame].pageId;
    const oldProcess = simulator.frames[victimFrame].processId;
    simulator.frames[victimFrame].load(pageId, processId);
    
    logEvent(`Substituição: P${oldProcess}:${oldPage} removida, P${processId}:${pageId} carregada`, 'warning');
    
    return victimFrame;
}

// Gerar sequência aleatória
function generateRandomSequence() {
    const mode = document.getElementById('allocationMode').value;
    const length = 15 + Math.floor(Math.random() * 10);
    const maxPage = 7;
    const sequence = [];
    
    if (mode === 'local') {
        const numProcesses = parseInt(document.getElementById('numProcesses').value) || 2;
        
        for (let i = 0; i < length; i++) {
            const processId = Math.floor(Math.random() * numProcesses) + 1;
            let pageId;
            
            if (i > 0 && Math.random() < 0.3) {
                const recentSameProcess = [];
                for (let j = Math.max(0, i - 5); j < i; j++) {
                    const [prevProc, prevPage] = sequence[j].split(':').map(n => parseInt(n));
                    if (prevProc === processId) {
                        recentSameProcess.push(prevPage);
                    }
                }
                if (recentSameProcess.length > 0) {
                    pageId = recentSameProcess[Math.floor(Math.random() * recentSameProcess.length)];
                } else {
                    pageId = Math.floor(Math.random() * maxPage) + 1;
                }
            } else {
                pageId = Math.floor(Math.random() * maxPage) + 1;
            }
            
            sequence.push(`${processId}:${pageId}`);
        }
    } else {
        for (let i = 0; i < length; i++) {
            if (i > 0 && Math.random() < 0.3) {
                const recentIndex = Math.max(0, i - Math.floor(Math.random() * 3) - 1);
                sequence.push(sequence[recentIndex]);
            } else {
                sequence.push(Math.floor(Math.random() * maxPage) + 1);
            }
        }
    }
    
    document.getElementById('pageSequence').value = sequence.join(',');
}

function autoPlay() {
    if (simulator.isPlaying) {
        stopAutoPlay();
    } else {
        simulator.isPlaying = true;
        document.getElementById('autoPlayBtn').textContent = 'Pausar';
        
        simulator.playInterval = setInterval(() => {
            stepSimulation();
            if (simulator.currentStep >= simulator.pageSequence.length) {
                stopAutoPlay();
            }
        }, 1000);
    }
}

function stopAutoPlay() {
    simulator.isPlaying = false;
    document.getElementById('autoPlayBtn').textContent = 'Auto Play';
    
    if (simulator.playInterval) {
        clearInterval(simulator.playInterval);
        simulator.playInterval = null;
    }
}

function resetSimulation() {
    stopAutoPlay();
    
    simulator.frames = [];
    simulator.pageSequence = [];
    simulator.currentStep = 0;
    simulator.stats = {
        accesses: 0,
        faults: 0,
        hits: 0
    };
    simulator.fifoQueue = [];
    simulator.clockPointer = 0;
    simulator.referenceBits = [];
    simulator.lruCounter = 0;
    simulator.lastUsed = [];
    simulator.futureUses = [];
    
    updateMemoryDisplay();
    updateSequenceDisplay();
    updateStats();
    enableControls(false);
    clearLog();
    
    document.getElementById('currentStep').innerHTML = '<p class="text-gray-400">Aguardando início da simulação...</p>';
    document.getElementById('clockInfo').classList.add('hidden');
}

function finishSimulation() {
    stopAutoPlay();
    enableControls(false);
    
    const faultRate = ((simulator.stats.faults / simulator.stats.accesses) * 100).toFixed(2);
    
    logEvent('Simulação concluída!', 'info');
    logEvent(`Taxa de Page Faults: ${faultRate}%`, 'info');
    
    showComparison();
}

// Parsear sequência de páginas e processos
function parsePageAndProcessSequence(input) {
    const items = input.split(',').map(item => item.trim());
    simulator.pageSequence = [];
    simulator.processSequence = [];
    
    items.forEach(item => {
        if (item.includes(':')) {
            const [process, page] = item.split(':').map(n => parseInt(n));
            simulator.processSequence.push(process);
            simulator.pageSequence.push(page);
        } else {
            const page = parseInt(item);
            simulator.pageSequence.push(page);
            
            if (simulator.mode === 'local') {
                const numProcesses = parseInt(document.getElementById('numProcesses').value) || 2;
                const processId = (simulator.processSequence.length % numProcesses) + 1;
                simulator.processSequence.push(processId);
            } else {
                simulator.processSequence.push(0);
            }
        }
    });
}

// Configurar processos para modo local
function setupLocalModeProcesses(totalFrames) {
    const numProcesses = parseInt(document.getElementById('numProcesses').value) || 2;
    const distribution = document.getElementById('frameDistribution').value;
    
    simulator.processes = [...new Set(simulator.processSequence)].sort();
    
    if (simulator.processes.length === 0) {
        simulator.processes = Array.from({length: numProcesses}, (_, i) => i + 1);
    }
    
    simulator.processAllocation = {};
    simulator.frameOwnership = {};
    
    if (distribution === 'equal') {
        const framesPerProcess = Math.floor(totalFrames / simulator.processes.length);
        let frameIndex = 0;
        
        simulator.processes.forEach(pid => {
            simulator.processAllocation[pid] = [];
            for (let i = 0; i < framesPerProcess && frameIndex < totalFrames; i++) {
                simulator.processAllocation[pid].push(frameIndex);
                simulator.frameOwnership[frameIndex] = pid;
                frameIndex++;
            }
        });
        
        let processIndex = 0;
        while (frameIndex < totalFrames) {
            const pid = simulator.processes[processIndex % simulator.processes.length];
            simulator.processAllocation[pid].push(frameIndex);
            simulator.frameOwnership[frameIndex] = pid;
            frameIndex++;
            processIndex++;
        }
    } else if (distribution === 'proportional') {
        const accessCount = {};
        simulator.processSequence.forEach(pid => {
            accessCount[pid] = (accessCount[pid] || 0) + 1;
        });
        
        const totalAccesses = simulator.processSequence.length;
        let frameIndex = 0;
        
        simulator.processes.forEach(pid => {
            const proportion = (accessCount[pid] || 1) / totalAccesses;
            const frameCount = Math.max(1, Math.round(proportion * totalFrames));
            simulator.processAllocation[pid] = [];
            
            for (let i = 0; i < frameCount && frameIndex < totalFrames; i++) {
                simulator.processAllocation[pid].push(frameIndex);
                simulator.frameOwnership[frameIndex] = pid;
                frameIndex++;
            }
        });
        
        if (frameIndex < totalFrames) {
            const lastProcess = simulator.processes[simulator.processes.length - 1];
            while (frameIndex < totalFrames) {
                simulator.processAllocation[lastProcess].push(frameIndex);
                simulator.frameOwnership[frameIndex] = lastProcess;
                frameIndex++;
            }
        }
    } else if (distribution === 'custom') {
        let frameIndex = 0;
        simulator.processes.forEach(pid => {
            const inputId = `process${pid}Frames`;
            const frameCount = parseInt(document.getElementById(inputId)?.value || 1);
            simulator.processAllocation[pid] = [];
            
            for (let i = 0; i < frameCount && frameIndex < totalFrames; i++) {
                simulator.processAllocation[pid].push(frameIndex);
                simulator.frameOwnership[frameIndex] = pid;
                frameIndex++;
            }
        });
    }
}

// Preparar dados para algoritmo Optimal
function prepareOptimalData() {
    simulator.futureUses = [];
    
    for (let i = 0; i < simulator.pageSequence.length; i++) {
        const page = simulator.pageSequence[i];
        const nextUses = {};
        
        for (const frame of simulator.frames) {
            if (frame.pageId !== null) {
                nextUses[frame.pageId] = Infinity;
            }
        }
        
        for (let j = i + 1; j < simulator.pageSequence.length; j++) {
            const futurePage = simulator.pageSequence[j];
            if (nextUses[futurePage] === Infinity) {
                nextUses[futurePage] = j - i;
            }
        }
        
        simulator.futureUses.push(nextUses);
    }
}

// Detectar Thrashing
function detectThrashing() {
    if (simulator.stats.accesses < 10) return false;
    
    const recentFaultRate = simulator.stats.faults / simulator.stats.accesses;
    return recentFaultRate > 0.5; // Thrashing se > 50% de page faults
}

// Log de eventos
function logEvent(message, type = 'info') {
    const log = document.getElementById('eventLog');
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    
    const colors = {
        info: 'text-blue-500',
        success: 'text-green-500',
        error: 'text-red-500',
        warning: 'text-yellow-500'
    };
    
    const entry = document.createElement('div');
    entry.className = `${colors[type]} mb-1`;
    entry.innerHTML = `[${timestamp}] ${message}`;
    
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

// Limpar log
function clearLog() {
    const log = document.getElementById('eventLog');
    if (log) {
        log.innerHTML = '';
    }
}
