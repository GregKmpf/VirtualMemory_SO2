let SequenciadePaginas = []; // Sequência de páginas de entrada.
let numFrames; // Número de frames de memória.
let memory = []; // Representa a memória física (os frames).
let pageFaults = 0; // Contador de page-faults.
let currentPageIndex = 0; // Posição atual na sequência de páginas.
let log = []; // Log de eventos para visualização passo a passo.


document.getElementById('start-simulation').addEventListener('click', startSimulation);

function startSimulation() {
    //Ler os dados de entrada
    const pageSequenceInput = document.getElementById('SequenciadePaginas').value;
    const numFramesInput = document.getElementById('num-frames').value;
    const algorithm = document.getElementById('algorithm').value;
    
    // Limpar o estado anterior da simulação
    SequenciadePaginas = pageSequenceInput.split(/[\s,]+/).filter(Boolean).map(Number);
    numFrames = parseInt(numFramesInput);
    memory = [];
    pageFaults = 0;
    currentPageIndex = 0;
    log = [];
    
    // Validação básica da entrada
    if (SequenciadePaginas.some(isNaN) || SequenciadePaginas.length === 0) {
        alert(' insira uma sequência de páginas válida (somente números).');
        return;
    }
    if (isNaN(numFrames) || numFrames < 1) {
        alert('insira um número de frames válido.');
        return;
    }
    
    // Iniciar a simulação passo a passo
    updateUI(); // Renderiza o estado inicial
    setTimeout(runStepByStep, 1000); // Inicia o loop com um pequeno atraso
}

function fifo_step(page) {
    // 1. A página já está na memória?
    if (memory.includes(page)) {
        log.push(`Página ${page} já está na memória (HIT).`);
        return; // Não faz nada
    }

    // 2. É um page fault
    pageFaults++;
    log.push(`Página ${page} não encontrada (PAGE FAULT).`);

    // 3. Há espaço livre?
    if (memory.length < numFrames) {
        memory.push(page);
        log.push(`Página ${page} alocada em um frame vazio.`);
    } else {
        // 4. Não há espaço, precisa substituir
        const pageToRemove = memory.shift(); // O mais antigo sai (FIFO)
        memory.push(page); // O novo entra
        log.push(`Página ${pageToRemove} foi substituída pela página ${page}.`);
    }


    function runStepByStep() {
    // Se já processou todas as páginas, para a simulação
    if (currentPageIndex >= SequenciadePaginas.length) {
        log.push("--------------------");
        log.push("Simulação Finalizada!");
        log.push(`Total de Page Faults: ${pageFaults}`);
        updateUI();
        document.getElementById('start-simulation').disabled = false; // Habilita o botão
        return;
    }

    const currentPage = SequenciadePaginas[currentPageIndex];
    log.push("--------------------");
    log.push(`Processando página: ${currentPage}`);
    
    // AQUI CHAMA O ALGORITMO
    fifo_step(currentPage);

    currentPageIndex++;
    updateUI();

    // Chama o próximo passo após um intervalo de tempo
    setTimeout(runStepByStep, 800);
}

}