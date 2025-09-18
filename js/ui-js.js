// js/ui.js
// Funções de interface e atualização visual

// Atualizar display da memória
function updateMemoryDisplay() {
    const container = document.getElementById('memoryFrames');
    container.innerHTML = '';
    
    simulator.frames.forEach((frame, index) => {
        const frameDiv = document.createElement('div');
        frameDiv.className = 'frame-slot bg-white/10 border-2 rounded-lg p-4 text-center transition-all duration-300';
        
        if (frame.pageId === null) {
            frameDiv.classList.add('border-gray-600');
            frameDiv.innerHTML = `
                <div class="text-xs text-gray-500 mb-1">Frame ${index}</div>
                <div class="text-2xl font-bold text-gray-600">∅</div>
                <div class="text-xs text-gray-500 mt-1">Vazio</div>
            `;
        } else {
            frameDiv.classList.add('border-blue-400', 'bg-blue-500/20');
            frameDiv.innerHTML = `
                <div class="text-xs text-gray-400 mb-1">Frame ${index}</div>
                <div class="text-2xl font-bold text-white">P${frame.pageId}</div>
                <div class="text-xs text-gray-400 mt-1">
                    ${simulator.algorithm === 'lru' ? `LRU: ${frame.lastAccess}` : ''}
                    ${simulator.algorithm === 'clock' ? `Ref: ${simulator.referenceBits[index]}` : ''}
                </div>
            `;
            
            // Adicionar indicador para FIFO
            if (simulator.algorithm === 'fifo' && simulator.fifoQueue[0] === index) {
                frameDiv.innerHTML += '<div class="text-xs text-yellow-400 mt-1">⚠️ Próx. saída</div>';
            }
        }
        
        container.appendChild(frameDiv);
    });
    
    // Mostrar bits de referência para Clock
    if (simulator.algorithm === 'clock') {
        updateClockDisplay();
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
        bitDiv.className = 'px-3 py-1 rounded-lg text-sm font-mono';
        
        if (index === simulator.clockPointer) {
            bitDiv.className += ' bg-yellow-500/30 border border-yellow-400';
            bitDiv.innerHTML = `F${index}: [${bit}] 👈`;
        } else {
            bitDiv.className += ' bg-white/10';
            bitDiv.innerHTML = `F${index}: [${bit}]`;
        }
        
        bitsContainer.appendChild(bitDiv);
    });
}

// Atualizar display da sequência
function updateSequenceDisplay() {
    const container = document.getElementById('accessSequence');
    container.innerHTML = '';
    
    simulator.pageSequence.forEach((page, index) => {
        const pageDiv = document.createElement('div');
        pageDiv.className = 'px-3 py-1 rounded-lg text-sm font-medium';
        
        if (index < simulator.currentStep) {
            // Página já processada
            const wasHit = checkIfWasHit(page, index);
            if (wasHit) {
                pageDiv.className += ' bg-green-500/30 text-green-300 border border-green-500';
            } else {
                pageDiv.className += ' bg-red-500/30 text-red-300 border border-red-500';
            }
        } else if (index === simulator.currentStep) {
            // Página atual
            pageDiv.className += ' bg-yellow-500/30 text-yellow-300 border-2 border-yellow-400 animate-pulse';
        } else {
            // Página futura
            pageDiv.className += ' bg-white/10 text-gray-400 border border-gray-600';
        }
        
        pageDiv.textContent = `P${page}`;
        container.appendChild(pageDiv);
    });
}

// Verificar se foi hit (simplificado)
function checkIfWasHit(page, index) {
    // Esta é uma verificação simplificada
    // Em produção, seria necessário rastrear o histórico completo
    if (index === 0) return false;
    
    for (let i = Math.max(0, index - simulator.frames.length); i < index; i++) {
        if (simulator.pageSequence[i] === page) {
            return true;
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
function updateStepInfo(page, result) {
    const stepDiv = document.getElementById('currentStep');
    
    let html = `
        <div class="flex items-center justify-between mb-3">
            <div>
                <span class="text-sm text-gray-400">Passo ${simulator.currentStep} de ${simulator.pageSequence.length}</span>
                <h3 class="text-lg font-medium text-white">Acessando Página ${page}</h3>
            </div>
            <div class="${result.type === 'hit' ? 'text-green-400' : 'text-red-400'} text-2xl font-bold">
                ${result.type === 'hit' ? '✅ HIT' : '❌ FAULT'}
            </div>
        </div>
    `;
    
    if (result.type === 'fault') {
        html += `
            <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mt-2">
                <p class="text-sm text-red-300">
                    📥 Page Fault! Página ${page} carregada no Frame ${result.frame}
                </p>
                ${simulator.algorithm === 'optimal' ? 
                    '<p class="text-xs text-gray-400 mt-1">ℹ️ Optimal escolhe a página que será usada mais tarde</p>' : ''}
                ${simulator.algorithm === 'clock' && simulator.referenceBits[result.frame] === 0 ? 
                    '<p class="text-xs text-gray-400 mt-1">⏰ Clock encontrou frame com bit de referência = 0</p>' : ''}
            </div>
        `;
    } else {
        html += `
            <div class="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mt-2">
                <p class="text-sm text-green-300">
                    ✨ Page Hit! Página ${page} já está no Frame ${result.frame}
                </p>
            </div>
        `;
    }
    
    // Mostrar Working Set
    const ws = analyzeWorkingSet();
    if (ws.thrashing) {
        html += `
            <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-2">
                <p class="text-sm text-yellow-300">
                    ⚠️ Possível Thrashing! Working Set (${ws.size}) > Frames (${simulator.frames.length})
                </p>
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
    warning.className = 'fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse';
    warning.innerHTML = '⚠️ Thrashing Detectado! Taxa de faults muito alta.';
    
    document.body.appendChild(warning);
    
    setTimeout(() => {
        warning.remove();
    }, 3000);
}

// Mostrar comparação de algoritmos
function showComparison() {
    const comparisonDiv = document.getElementById('algorithmComparison');
    const chartDiv = document.getElementById('comparisonChart');
    
    // Executar comparação
    const results = compareAlgorithms();
    
    // Criar visualização
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
    
    Object.entries(results).forEach(([algo, stats]) => {
        const isCurrentAlgo = algo === document.getElementById('algorithm').value;
        html += `
            <div class="bg-white/5 rounded-lg p-3 ${isCurrentAlgo ? 'ring-2 ring-' + colors[algo] + '-400' : ''}">
                <h4 class="text-sm font-medium text-${colors[algo]}-400 mb-2">${names[algo]}</h4>
                <div class="space-y-1">
                    <p class="text-xs text-gray-400">Faults: <span class="text-white font-medium">${stats.faults}</span></p>
                    <p class="text-xs text-gray-400">Hits: <span class="text-white font-medium">${stats.hits}</span></p>
                    <p class="text-sm font-bold text-${colors[algo]}-400">${stats.faultRate}%</p>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    // Adicionar análise de localidade
    const locality = calculateLocality();
    html += `
        <div class="mt-4 bg-white/5 rounded-lg p-3">
            <h4 class="text-sm font-medium text-purple-400 mb-2">📊 Análise de Localidade</h4>
            <div class="grid grid-cols-3 gap-2 text-xs">
                <div>
                    <span class="text-gray-400">Média:</span>
                    <span class="text-white font-medium ml-1">${locality.average}%</span>
                </div>
                <div>
                    <span class="text-gray-400">Temporal:</span>
                    <span class="text-white font-medium ml-1">${locality.temporal}%</span>
                </div>
                <div>
                    <span class="text-gray-400">Espacial:</span>
                    <span class="text-white font-medium ml-1">${locality.spatial}%</span>
                </div>
            </div>
        </div>
    `;
    
    chartDiv.innerHTML = html;
    comparisonDiv.classList.remove('hidden');
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Configurar valores padrão
    generateRandomSequence();
    
    // Adicionar tooltips
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