
// Atualizar display da memória
function updateMemoryDisplay() {
    const container = document.getElementById('memoryFrames');
    container.innerHTML = '';
    
    simulator.frames.forEach((frame, index) => {
        const frameDiv = document.createElement('div');
        frameDiv.className = 'frame-slot bg-white border-2 rounded-md p-4 text-center transition-all duration-300';
        
        const frameOwner = simulator.mode === 'local' ? simulator.frameOwnership[index] : null;
        
        if (frame.pageId === null) {
            frameDiv.classList.add('border-gray-300');
            frameDiv.innerHTML = `
                <div class="text-xs text-gray-500 mb-1">Frame ${index}</div>
                <div class="text-2xl font-bold text-gray-400">∅</div>
                <div class="text-xs text-gray-500 mt-1">Vazio</div>
                ${frameOwner !== null ? `<div class="text-xs text-purple-600 mt-1">P${frameOwner}</div>` : ''}
            `;
        } else {
            const processColors = ['blue', 'green', 'orange', 'purple', 'pink', 'indigo'];
            const processIndex = frame.processId % processColors.length;
            const color = processColors[processIndex];
            
            frameDiv.classList.add(`border-${color}-500`, `bg-${color}-50`);
            frameDiv.innerHTML = `
                <div class="text-xs text-gray-600 mb-1">Frame ${index}</div>
                <div class="text-2xl font-bold text-gray-900">
                    ${simulator.mode === 'local' ? `P${frame.processId}:` : ''}${frame.pageId}
                </div>
                <div class="text-xs text-gray-600 mt-1">
                    ${simulator.algorithm === 'lru' ? `LRU: ${frame.lastAccess}` : ''}
                    ${simulator.algorithm === 'clock' ? `Ref: ${simulator.referenceBits[index]}` : ''}
                </div>
            `;
            
            if (simulator.algorithm === 'fifo') {
                if (simulator.mode === 'local') {
                    const queue = simulator.fifoQueueByProcess[frame.processId];
                    if (queue && queue[0] === index) {
                        frameDiv.innerHTML += '<div class="text-xs text-orange-600 mt-1">Próx. saída</div>';
                    }
                } else if (simulator.fifoQueue[0] === index) {
                    frameDiv.innerHTML += '<div class="text-xs text-orange-600 mt-1">Próx. saída</div>';
                }
            }
        }
        
        container.appendChild(frameDiv);
    });
    
    if (simulator.algorithm === 'clock') {
        updateClockDisplay();
    }
    
    if (simulator.mode === 'local') {
        updateProcessAllocationDisplay();
    }
}

// Atualizar display do Clock
function updateClockDisplay() {
    const clockInfo = document.getElementById('clockInfo');
    const bitsContainer = document.getElementById('referenceBits');
    
    clockInfo.classList.remove('hidden');
    bitsContainer.innerHTML = '';
    
    simulator.referenceBits.forEach((bit, index) => {
        const bitDiv = document.createElement('div');
        bitDiv.className = 'px-3 py-1 rounded-md text-sm font-mono';
        
        if (index === simulator.clockPointer) {
            bitDiv.className += ' bg-yellow-100 border border-yellow-500 text-gray-900';
            bitDiv.innerHTML = `F${index}: [${bit}]`;
        } else {
            bitDiv.className += ' bg-gray-100 text-gray-700';
            bitDiv.innerHTML = `F${index}: [${bit}]`;
        }
        
        bitsContainer.appendChild(bitDiv);
    });
}

// Atualizar display da alocação de processos
function updateProcessAllocationDisplay() {
    const container = document.getElementById('processAllocationPreview');
    if (!container) return;
    
    let html = '<div class="text-sm"><strong>Alocação Atual:</strong></div>';
    
    Object.entries(simulator.processAllocation).forEach(([processId, frames]) => {
        const color = ['blue', 'green', 'orange', 'purple'][processId % 4];
        html += `
            <div class="flex items-center gap-2 mt-1">
                <span class="text-${color}-600 font-medium">Processo ${processId}:</span>
                <span class="text-gray-700">Frames [${frames.join(', ')}]</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Atualizar display da sequência
function updateSequenceDisplay() {
    const container = document.getElementById('accessSequence');
    container.innerHTML = '';
    
    simulator.pageSequence.forEach((page, index) => {
        const process = simulator.processSequence[index] || 0;
        const pageDiv = document.createElement('div');
        pageDiv.className = 'px-3 py-1 rounded-md text-sm font-medium';
        
        if (index < simulator.currentStep) {
            const wasHit = checkIfWasHit(page, index, process);
            if (wasHit) {
                pageDiv.className += ' bg-green-100 text-green-700 border border-green-300';
            } else {
                pageDiv.className += ' bg-red-100 text-red-700 border border-red-300';
            }
        } else if (index === simulator.currentStep) {
            pageDiv.className += ' bg-yellow-100 text-yellow-700 border-2 border-yellow-500 animate-pulse';
        } else {
            pageDiv.className += ' bg-gray-100 text-gray-500 border border-gray-300';
        }
        
        pageDiv.textContent = simulator.mode === 'local' ? `P${process}:${page}` : `${page}`;
        container.appendChild(pageDiv);
    });
}

// Verificar se foi hit (considerando processo no modo local)
function checkIfWasHit(page, index, process = 0) {
    if (index === 0) return false;
    
    if (simulator.mode === 'local') {
        const processFrames = simulator.processAllocation[process] || [];
        for (let i = Math.max(0, index - processFrames.length); i < index; i++) {
            if (simulator.pageSequence[i] === page && simulator.processSequence[i] === process) {
                return true;
            }
        }
    } else {
        for (let i = Math.max(0, index - simulator.frames.length); i < index; i++) {
            if (simulator.pageSequence[i] === page) {
                return true;
            }
        }
    }
    return false;
}

// Atualizar estatísticas
function updateStats() {
    document.getElementById('totalAccesses').textContent = simulator.stats.accesses;
    document.getElementById('pageFaults').textContent = simulator.stats.faults;
    document.getElementById('pageHits').textContent = simulator.stats.hits;
    
    const faultRate = simulator.stats.accesses > 0 
        ? ((simulator.stats.faults / simulator.stats.accesses) * 100).toFixed(1)
        : '0.0';
    document.getElementById('faultRate').textContent = `${faultRate}%`;
    
    // Detectar e avisar sobre thrashing
    if (detectThrashing()) {
        showThrashingWarning();
    }
}

// Atualizar informação do passo atual
function updateStepInfo(page, result, process = 0) {
    const stepDiv = document.getElementById('currentStep');
    
    let html = `
        <div class="flex items-center justify-between mb-3">
            <div>
                <span class="text-sm text-gray-500">Passo ${simulator.currentStep} de ${simulator.pageSequence.length}</span>
                <h3 class="text-lg font-medium text-gray-900">
                    Acessando ${simulator.mode === 'local' ? `Processo ${process} - ` : ''}Página ${page}
                </h3>
            </div>
            <div class="${result.type === 'hit' ? 'text-green-600' : 'text-red-600'} text-2xl font-bold">
                ${result.type === 'hit' ? 'HIT' : 'FAULT'}
            </div>
        </div>
    `;
    
    if (result.type === 'fault') {
        html += `
            <div class="bg-red-50 border border-red-200 rounded-md p-3 mt-2">
                <p class="text-sm text-red-700">
                     Page Fault! ${simulator.mode === 'local' ? `P${process}:${page}` : `Página ${page}`} carregada no Frame ${result.frame}
                </p>
                ${simulator.algorithm === 'optimal' ? 
                    '<p class="text-xs text-gray-600 mt-1">ℹ️ Optimal escolhe a página que será usada mais tarde</p>' : ''}
                ${simulator.algorithm === 'clock' && simulator.referenceBits[result.frame] === 0 ? 
                    '<p class="text-xs text-gray-600 mt-1">Clock encontrou frame com bit de referência = 0</p>' : ''}
                ${simulator.mode === 'local' ? 
                    `<p class="text-xs text-gray-600 mt-1">Frames do Processo ${process}: [${simulator.processAllocation[process].join(', ')}]</p>` : ''}
            </div>
        `;
    } else {
        html += `
            <div class="bg-green-50 border border-green-200 rounded-md p-3 mt-2">
                <p class="text-sm text-green-700">
                     Page Hit! ${simulator.mode === 'local' ? `P${process}:${page}` : `Página ${page}`} já está no Frame ${result.frame}
                </p>
            </div>
        `;
    }
    
    const ws = analyzeWorkingSet();
    if (ws.thrashing) {
        html += `
            <div class="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-2">
                <p class="text-sm text-yellow-700">
                    Possível Thrashing! Working Set (${ws.size}) > Frames (${simulator.frames.length})
                </p>
            </div>
        `;
    }
    
    if (simulator.mode === 'local' && simulator.processStats[process]) {
        const stats = simulator.processStats[process];
        const faultRate = stats.accesses > 0 ? 
            ((stats.faults / stats.accesses) * 100).toFixed(1) : '0.0';
        
        html += `
            <div class="bg-purple-50 border border-purple-200 rounded-md p-3 mt-2">
                <p class="text-sm text-purple-700 font-medium mb-1">Estatísticas do Processo ${process}</p>
                <div class="grid grid-cols-3 gap-2 text-xs">
                    <div>Acessos: <span class="font-bold">${stats.accesses}</span></div>
                    <div>Faults: <span class="font-bold text-red-600">${stats.faults}</span></div>
                    <div>Taxa: <span class="font-bold text-yellow-600">${faultRate}%</span></div>
                </div>
            </div>
        `;
    }
    
    stepDiv.innerHTML = html;
}

// Habilitar/desabilitar controles
function enableControls(enable) {
    document.getElementById('stepBtn').disabled = !enable;
    document.getElementById('autoPlayBtn').disabled = !enable;
    
    if (!enable) {
        document.getElementById('stepBtn').classList.add('opacity-50', 'cursor-not-allowed');
        document.getElementById('autoPlayBtn').classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        document.getElementById('stepBtn').classList.remove('opacity-50', 'cursor-not-allowed');
        document.getElementById('autoPlayBtn').classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

// Mostrar aviso de thrashing
function showThrashingWarning() {
    const warning = document.createElement('div');
    warning.className = 'fixed top-4 right-4 bg-red-600 text-white px-4 py-3 rounded-md shadow-lg animate-pulse';
    warning.innerHTML = 'Thrashing Detectado! Taxa de faults muito alta.';
    
    document.body.appendChild(warning);
    
    setTimeout(() => {
        warning.remove();
    }, 3000);
}

// Mostrar comparação de algoritmos
function showComparison() {
    const comparisonDiv = document.getElementById('algorithmComparison');
    const chartDiv = document.getElementById('comparisonChart');
    
    const results = compareAlgorithms();
    
    let html = '<div class="grid grid-cols-2 md:grid-cols-4 gap-3">';
    
    const colors = {
        fifo: 'blue',
        optimal: 'green', 
        clock: 'yellow',
        lru: 'purple'
    };
    
    const names = {
        fifo: 'FIFO',
        optimal: 'Optimal',
        clock: 'Clock',
        lru: 'LRU'
    };
    
    // Identificar o melhor e pior desempenho
    let bestRate = 100;
    let worstRate = 0;
    let bestAlgo = '';
    let worstAlgo = '';
    
    Object.entries(results).forEach(([algo, stats]) => {
        const rate = parseFloat(stats.faultRate);
        if (rate < bestRate) {
            bestRate = rate;
            bestAlgo = algo;
        }
        if (rate > worstRate) {
            worstRate = rate;
            worstAlgo = algo;
        }
    });
    
    Object.entries(results).forEach(([algo, stats]) => {
        const isCurrentAlgo = algo === document.getElementById('algorithm').value;
        const isBest = algo === bestAlgo;
        const isWorst = algo === worstAlgo;
        
        let borderClass = 'border-gray-200';
        if (isCurrentAlgo) {
            borderClass = `border-${colors[algo]}-500 ring-2 ring-${colors[algo]}-200`;
        }
        
        let badge = '';
        if (isBest) {
            badge = '<span class="inline-block ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">Melhor</span>';
        } else if (isWorst) {
            badge = '<span class="inline-block ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">Pior</span>';
        }
        
        html += `
            <div class="bg-white rounded-md p-3 border ${borderClass}">
                <h4 class="text-sm font-medium text-${colors[algo]}-600 mb-2">
                    ${names[algo]}${badge}
                </h4>
                <div class="space-y-1">
                    <p class="text-xs text-gray-600">Faults: <span class="text-gray-900 font-medium">${stats.faults}</span></p>
                    <p class="text-xs text-gray-600">Hits: <span class="text-gray-900 font-medium">${stats.hits}</span></p>
                    <p class="text-sm font-bold text-${colors[algo]}-600">${stats.faultRate}%</p>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    const locality = calculateLocality();
    html += `
        <div class="mt-4 bg-white rounded-md border border-gray-200 p-3">
            <h4 class="text-sm font-medium text-gray-700 mb-2">Análise de Localidade</h4>
            <div class="grid grid-cols-3 gap-2 text-xs">
                <div>
                    <span class="text-gray-600">Média:</span>
                    <span class="text-gray-900 font-medium ml-1">${locality.average}%</span>
                </div>
                <div>
                    <span class="text-gray-600">Temporal:</span>
                    <span class="text-gray-900 font-medium ml-1">${locality.temporal}%</span>
                </div>
                <div>
                    <span class="text-gray-600">Espacial:</span>
                    <span class="text-gray-900 font-medium ml-1">${locality.spatial}%</span>
                </div>
            </div>
        </div>
    `;
    
    html += `
        <div class="mt-3 text-xs text-gray-600 bg-gray-50 rounded-md p-2">
            <p><strong>Análise:</strong> O algoritmo <span class="text-${colors[bestAlgo]}-600 font-medium">${names[bestAlgo]}</span> 
            teve o melhor desempenho com ${bestRate}% de page faults, enquanto 
            <span class="text-${colors[worstAlgo]}-600 font-medium">${names[worstAlgo]}</span> 
            teve ${worstRate}% de page faults.</p>
        </div>
    `;
    
    chartDiv.innerHTML = html;
    comparisonDiv.classList.remove('hidden');
}

// Configurar modo local/global
function setupAllocationMode() {
    const mode = document.getElementById('allocationMode').value;
    const processConfig = document.getElementById('processConfig');
    
    if (mode === 'local') {
        processConfig.classList.remove('hidden');
        setupProcessConfiguration();
    } else {
        processConfig.classList.add('hidden');
    }
    
    const hint = document.querySelector('#pageSequence').parentElement.querySelector('p');
    if (mode === 'local') {
        hint.textContent = 'Modo Local: use processo:página (1:2,2:3) ou deixe que o sistema atribua processos automaticamente.';
    } else {
        hint.textContent = 'Modo Global: use apenas números (1,2,3). Modo Local: use processo:página (1:2,2:3) ou deixe que o sistema atribua processos automaticamente.';
    }
}

function setupProcessConfiguration() {
    const numProcesses = parseInt(document.getElementById('numProcesses').value) || 2;
    const numFrames = parseInt(document.getElementById('numFrames').value) || 4;
    const distribution = document.getElementById('frameDistribution').value;
    
    document.getElementById('totalFramesAvailable').textContent = numFrames;
    
    const customInputs = document.getElementById('customFrameAllocation');
    if (distribution === 'custom') {
        customInputs.classList.remove('hidden');
        createCustomFrameInputs(numProcesses, numFrames);
    } else {
        customInputs.classList.add('hidden');
    }
    
    updateProcessAllocationPreview();
}

// Criar inputs customizados para frames
function createCustomFrameInputs(numProcesses, totalFrames) {
    const container = document.getElementById('processFrameInputs');
    container.innerHTML = '';
    
    const framesPerProcess = Math.floor(totalFrames / numProcesses);
    
    for (let i = 1; i <= numProcesses; i++) {
        const inputDiv = document.createElement('div');
        inputDiv.innerHTML = `
            <label class="text-xs text-gray-600">P${i}</label>
            <input type="number" id="process${i}Frames" min="1" max="${totalFrames}" 
                   value="${framesPerProcess}" class="w-full px-2 py-1 bg-white border border-gray-300 rounded text-sm"
                   onchange="updateProcessAllocationPreview()">
        `;
        container.appendChild(inputDiv);
    }
}

// Atualizar preview da alocação
function updateProcessAllocationPreview() {
    const preview = document.getElementById('processAllocationPreview');
    if (!preview) return;
    
    const numProcesses = parseInt(document.getElementById('numProcesses').value) || 2;
    const numFrames = parseInt(document.getElementById('numFrames').value) || 4;
    const distribution = document.getElementById('frameDistribution').value;
    
    let html = '<div class="text-sm font-medium mb-2">Preview da Alocação:</div>';
    
    if (distribution === 'equal') {
        const framesPerProcess = Math.floor(numFrames / numProcesses);
        const remainder = numFrames % numProcesses;
        
        for (let i = 1; i <= numProcesses; i++) {
            const extraFrame = i <= remainder ? 1 : 0;
            const total = framesPerProcess + extraFrame;
            html += `<div class="text-xs text-gray-600">Processo ${i}: ${total} frames</div>`;
        }
    } else if (distribution === 'custom') {
        let totalAllocated = 0;
        for (let i = 1; i <= numProcesses; i++) {
            const input = document.getElementById(`process${i}Frames`);
            const frames = input ? parseInt(input.value) || 0 : 0;
            totalAllocated += frames;
            html += `<div class="text-xs text-gray-600">Processo ${i}: ${frames} frames</div>`;
        }
        
        if (totalAllocated > numFrames) {
            html += `<div class="text-xs text-red-600 mt-1">Total excede ${numFrames} frames disponíveis!</div>`;
        } else if (totalAllocated < numFrames) {
            html += `<div class="text-xs text-yellow-600 mt-1">ℹ️ ${numFrames - totalAllocated} frames não alocados</div>`;
        }
    }
    
    preview.innerHTML = html;
}

// Event listeners para configuração
function setupEventListeners() {
    document.getElementById('allocationMode').addEventListener('change', setupAllocationMode);
    
    document.getElementById('numFrames').addEventListener('change', () => {
        if (document.getElementById('allocationMode').value === 'local') {
            setupProcessConfiguration();
        }
    });
    
    document.getElementById('numProcesses').addEventListener('change', setupProcessConfiguration);
    
    document.getElementById('frameDistribution').addEventListener('change', setupProcessConfiguration);
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    generateRandomSequence();
    
    setupEventListeners();
    
    setupAllocationMode();
    
    addTooltips();
});

// Adicionar tooltips explicativos
function addTooltips() {
    const tooltips = {
        'algorithm': 'Escolha o algoritmo de substituição de páginas',
        'numFrames': 'Número de frames disponíveis na memória física',
        'allocationMode': 'Global: compartilhado entre processos | Local: fixo por processo'
    };
    
    Object.entries(tooltips).forEach(([id, text]) => {
        const element = document.getElementById(id);
        if (element) {
            element.title = text;
        }
    });
}
