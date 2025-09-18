// js/algorithms.js
// Implementação dos algoritmos de substituição de páginas

// Algoritmo FIFO (First In, First Out)
function algorithmFIFO() {
    // Remove o primeiro frame da fila (mais antigo)
    const victim = simulator.fifoQueue.shift();
    
    // Adiciona o frame ao final da fila
    simulator.fifoQueue.push(victim);
    
    return victim;
}

// FIFO para modo Local
function algorithmFIFOLocal(processId) {
    if (!simulator.fifoQueueByProcess[processId]) {
        simulator.fifoQueueByProcess[processId] = [];
        // Inicializar fila com frames do processo
        const processFrames = simulator.processAllocation[processId];
        simulator.fifoQueueByProcess[processId] = [...processFrames];
    }
    
    const queue = simulator.fifoQueueByProcess[processId];
    const victim = queue.shift();
    queue.push(victim);
    
    return victim;
}

// Algoritmo Optimal (Teórico - usa conhecimento futuro)
function algorithmOptimal() {
    let victim = 0;
    let maxDistance = -1;
    
    // Para cada frame ocupado
    for (let i = 0; i < simulator.frames.length; i++) {
        if (simulator.frames[i].pageId === null) continue;
        
        const pageId = simulator.frames[i].pageId;
        let nextUse = Infinity;
        
        // Encontrar próximo uso desta página
        for (let j = simulator.currentStep + 1; j < simulator.pageSequence.length; j++) {
            if (simulator.pageSequence[j] === pageId) {
                nextUse = j - simulator.currentStep;
                break;
            }
        }
        
        // Página que será usada mais tarde (ou nunca) é a vítima ideal
        if (nextUse > maxDistance) {
            maxDistance = nextUse;
            victim = i;
        }
    }
    
    return victim;
}

// Optimal para modo Local
function algorithmOptimalLocal(processId, candidateFrames) {
    let victim = candidateFrames[0];
    let maxDistance = -1;
    
    for (const frameIndex of candidateFrames) {
        if (simulator.frames[frameIndex].pageId === null) continue;
        
        const pageId = simulator.frames[frameIndex].pageId;
        let nextUse = Infinity;
        
        // Encontrar próximo uso desta página pelo mesmo processo
        for (let j = simulator.currentStep + 1; j < simulator.pageSequence.length; j++) {
            if (simulator.pageSequence[j] === pageId && 
                simulator.processSequence[j] === processId) {
                nextUse = j - simulator.currentStep;
                break;
            }
        }
        
        if (nextUse > maxDistance) {
            maxDistance = nextUse;
            victim = frameIndex;
        }
    }
    
    return victim;
}// js/algorithms.js
// Implementação dos algoritmos de substituição de páginas

// Algoritmo FIFO (First In, First Out)
function algorithmFIFO() {
    // Remove o primeiro frame da fila (mais antigo)
    const victim = simulator.fifoQueue.shift();
    
    // Adiciona o frame ao final da fila
    simulator.fifoQueue.push(victim);
    
    return victim;
}

// Algoritmo Optimal (Teórico - usa conhecimento futuro)
function algorithmOptimal() {
    let victim = 0;
    let maxDistance = -1;
    
    // Para cada frame ocupado
    for (let i = 0; i < simulator.frames.length; i++) {
        if (simulator.frames[i].pageId === null) continue;
        
        const pageId = simulator.frames[i].pageId;
        let nextUse = Infinity;
        
        // Encontrar próximo uso desta página
        for (let j = simulator.currentStep + 1; j < simulator.pageSequence.length; j++) {
            if (simulator.pageSequence[j] === pageId) {
                nextUse = j - simulator.currentStep;
                break;
            }
        }
        
        // Página que será usada mais tarde (ou nunca) é a vítima ideal
        if (nextUse > maxDistance) {
            maxDistance = nextUse;
            victim = i;
        }
    }
    
    return victim;
}

// Algoritmo Clock (Second-Chance)
function algorithmClock() {
    let victim = -1;
    let attempts = 0;
    const maxAttempts = simulator.frames.length * 2;
    
    while (victim === -1 && attempts < maxAttempts) {
        const current = simulator.clockPointer;
        
        // Se o frame está vazio, use-o
        if (simulator.frames[current].pageId === null) {
            victim = current;
        }
        // Se bit de referência é 0, este é a vítima
        else if (simulator.referenceBits[current] === 0) {
            victim = current;
        }
        // Se bit de referência é 1, dê segunda chance
        else {
            simulator.referenceBits[current] = 0;
            logEvent(`⏰ Clock: Segunda chance para página ${simulator.frames[current].pageId} no frame ${current}`, 'warning');
        }
        
        // Mover ponteiro do relógio
        simulator.clockPointer = (simulator.clockPointer + 1) % simulator.frames.length;
        attempts++;
    }
    
    // Se não encontrou vítima (todos com bit 1), força primeiro frame
    if (victim === -1) {
        victim = 0;
        simulator.referenceBits[0] = 0;
    }
    
    return victim;
}

// Clock para modo Local
function algorithmClockLocal(processId, candidateFrames) {
    if (!simulator.clockPointerByProcess[processId]) {
        simulator.clockPointerByProcess[processId] = 0;
    }
    
    let victim = -1;
    let attempts = 0;
    const maxAttempts = candidateFrames.length * 2;
    
    while (victim === -1 && attempts < maxAttempts) {
        const localPointer = simulator.clockPointerByProcess[processId];
        const current = candidateFrames[localPointer % candidateFrames.length];
        
        if (simulator.frames[current].pageId === null) {
            victim = current;
        } else if (simulator.referenceBits[current] === 0) {
            victim = current;
        } else {
            simulator.referenceBits[current] = 0;
            logEvent(`⏰ Clock Local P${processId}: Segunda chance para página ${simulator.frames[current].pageId}`, 'warning');
        }
        
        simulator.clockPointerByProcess[processId] = (localPointer + 1) % candidateFrames.length;
        attempts++;
    }
    
    if (victim === -1) {
        victim = candidateFrames[0];
        simulator.referenceBits[candidateFrames[0]] = 0;
    }
    
    return victim;
}

// Algoritmo LRU (Least Recently Used)
function algorithmLRU() {
    let victim = 0;
    let oldestAccess = Infinity;
    
    // Encontrar frame com acesso mais antigo
    for (let i = 0; i < simulator.frames.length; i++) {
        if (simulator.frames[i].pageId === null) continue;
        
        if (simulator.frames[i].lastAccess < oldestAccess) {
            oldestAccess = simulator.frames[i].lastAccess;
            victim = i;
        }
    }
    
    return victim;
}

// LRU para modo Local
function algorithmLRULocal(candidateFrames) {
    let victim = candidateFrames[0];
    let oldestAccess = Infinity;
    
    for (const frameIndex of candidateFrames) {
        if (simulator.frames[frameIndex].pageId === null) continue;
        
        if (simulator.frames[frameIndex].lastAccess < oldestAccess) {
            oldestAccess = simulator.frames[frameIndex].lastAccess;
            victim = frameIndex;
        }
    }
    
    return victim;
}

// Análise de Working Set (para detectar thrashing)
function analyzeWorkingSet(windowSize = 5) {
    const start = Math.max(0, simulator.currentStep - windowSize);
    const end = simulator.currentStep;
    
    const workingSet = new Set();
    
    for (let i = start; i < end && i < simulator.pageSequence.length; i++) {
        workingSet.add(simulator.pageSequence[i]);
    }
    
    return {
        size: workingSet.size,
        pages: Array.from(workingSet),
        thrashing: workingSet.size > simulator.frames.length
    };
}

// Simular todos os algoritmos para comparação
function compareAlgorithms() {
    const originalState = {
        algorithm: simulator.algorithm,
        frames: simulator.frames.slice(),
        currentStep: simulator.currentStep,
        stats: {...simulator.stats},
        fifoQueue: [...simulator.fifoQueue],
        clockPointer: simulator.clockPointer,
        referenceBits: [...simulator.referenceBits],
        lruCounter: simulator.lruCounter
    };
    
    const sequence = simulator.pageSequence.slice();
    const numFrames = originalState.frames.length;
    
    const results = {};
    const algorithms = ['fifo', 'optimal', 'clock', 'lru'];
    
    algorithms.forEach(algo => {
        // Reset completo para cada algoritmo
        simulator.algorithm = algo;
        simulator.frames = [];
        simulator.currentStep = 0;
        simulator.stats = { accesses: 0, faults: 0, hits: 0 };
        simulator.fifoQueue = [];
        simulator.clockPointer = 0;
        simulator.referenceBits = new Array(numFrames).fill(0);
        simulator.lruCounter = 0;
        simulator.lastUsed = new Array(numFrames).fill(-1);
        simulator.futureUses = [];
        
        // Inicializar frames limpos
        for (let i = 0; i < numFrames; i++) {
            simulator.frames.push(new Frame(i));
        }
        
        // Preparar dados para Optimal se necessário
        if (algo === 'optimal') {
            simulator.pageSequence = sequence; // Temporariamente definir para prepareOptimalData
            prepareOptimalData();
        }
        
        // Executar simulação completa para este algoritmo
        for (let i = 0; i < sequence.length; i++) {
            const page = sequence[i];
            simulator.currentStep = i;
            accessPage(page);
        }
        
        // Salvar resultados deste algoritmo
        results[algo] = {
            faults: simulator.stats.faults,
            hits: simulator.stats.hits,
            faultRate: (simulator.stats.faults / simulator.stats.accesses * 100).toFixed(2)
        };
    });
    
    // Restaurar estado original completamente
    simulator.algorithm = originalState.algorithm;
    simulator.frames = originalState.frames;
    simulator.currentStep = originalState.currentStep;
    simulator.stats = originalState.stats;
    simulator.fifoQueue = originalState.fifoQueue;
    simulator.clockPointer = originalState.clockPointer;
    simulator.referenceBits = originalState.referenceBits;
    simulator.lruCounter = originalState.lruCounter;
    
    return results;
}

// Calcular princípio da localidade
function calculateLocality(windowSize = 5) {
    const localities = [];
    
    for (let i = 0; i < simulator.pageSequence.length - windowSize; i++) {
        const window = simulator.pageSequence.slice(i, i + windowSize);
        const uniquePages = new Set(window).size;
        const locality = 1 - (uniquePages / windowSize);
        localities.push(locality);
    }
    
    const avgLocality = localities.reduce((a, b) => a + b, 0) / localities.length;
    
    return {
        average: (avgLocality * 100).toFixed(2),
        temporal: detectTemporalLocality(),
        spatial: detectSpatialLocality()
    };
}

// Detectar localidade temporal (páginas repetidas)
function detectTemporalLocality() {
    let repeats = 0;
    
    for (let i = 1; i < simulator.pageSequence.length; i++) {
        for (let j = Math.max(0, i - 3); j < i; j++) {
            if (simulator.pageSequence[i] === simulator.pageSequence[j]) {
                repeats++;
                break;
            }
        }
    }
    
    return (repeats / simulator.pageSequence.length * 100).toFixed(2);
}

// Detectar localidade espacial (páginas próximas)
function detectSpatialLocality() {
    let spatial = 0;
    
    for (let i = 1; i < simulator.pageSequence.length; i++) {
        const diff = Math.abs(simulator.pageSequence[i] - simulator.pageSequence[i - 1]);
        if (diff <= 1) {
            spatial++;
        }
    }
    
    return (spatial / (simulator.pageSequence.length - 1) * 100).toFixed(2);
}

// Modo Local: Alocar frames por processo
function allocateLocalFrames(processes) {
    const framesPerProcess = Math.floor(simulator.frames.length / processes.length);
    const allocation = {};
    
    let frameIndex = 0;
    processes.forEach(processId => {
        allocation[processId] = [];
        for (let i = 0; i < framesPerProcess && frameIndex < simulator.frames.length; i++) {
            allocation[processId].push(frameIndex++);
        }
    });
    
    // Distribuir frames restantes
    let processIndex = 0;
    while (frameIndex < simulator.frames.length) {
        allocation[processes[processIndex % processes.length]].push(frameIndex++);
    }
    
    return allocation;
}

// Verificar se processo está em thrashing
function isProcessThrashing(processId, windowSize = 5) {
    const recentAccesses = [];
    const recentFaults = [];
    
    // Coletar estatísticas recentes do processo
    for (let i = Math.max(0, simulator.currentStep - windowSize); i < simulator.currentStep; i++) {
        // Aqui seria necessário rastrear por processo
        // Simplificado para demonstração
    }
    
    const faultRate = recentFaults.length / Math.max(recentAccesses.length, 1);
    return faultRate > 0.5;
}