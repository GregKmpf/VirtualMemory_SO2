let pageSequence = []; // Sequência de páginas de entrada.
let numFrames; // Número de frames de memória.
let memory = []; // Representa a memória física (os frames).
let pageFaults = 0; // Contador de page-faults.
let currentPageIndex = 0; // Posição atual na sequência de páginas.
let log = []; // Log de eventos para visualização passo a passo.


document.getElementById('start-simulation').addEventListener('click', startSimulation);

function startSimulation() {
    //Ler os dados de entrada
    const pageSequenceInput = document.getElementById('page-sequence').value;
    const numFramesInput = document.getElementById('num-frames').value;
    const algorithm = document.getElementById('algorithm').value;
    
    // Limpar o estado anterior da simulação
    pageSequence = pageSequenceInput.split(/[\s,]+/).filter(Boolean).map(Number);
    numFrames = parseInt(numFramesInput);
    memory = [];
    pageFaults = 0;
    currentPageIndex = 0;
    log = [];
    
    // Validação básica da entrada
    if (pageSequence.some(isNaN) || pageSequence.length === 0) {
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