# Simulador de Memória Virtual - Paginação por Demanda

## Descrição

Simulador educacional interativo de **Memória Virtual com Paginação por Demanda**, desenvolvido para demonstrar conceitos fundamentais de Sistemas Operacionais, incluindo page-faults, algoritmos de substituição de páginas, thrashing e princípio da localidade.

## Características Principais

- **4 Algoritmos de Substituição**: FIFO, Optimal, Clock/Second-Chance, LRU
- **Modos de Alocação**: Global e Local
- **Visualização em Tempo Real**: Feedback visual
- **Detecção de Thrashing**: Alertas automáticos quando detectado
- **Análise Comparativa**: Compare o desempenho de todos os algoritmos
- **Log**: Registro completo de todas as operações


## Como Executar

### Requisitos Mínimos
- Navegador web moderno (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Conexão com internet (para carregar Tailwind CSS via CDN)

### Instalação e Execução

1. **Clone o repositório ou baixe os arquivos:**
```bash
git clone https://github.com/seu-usuario/simulador-memoria-virtual.git
cd simulador-memoria-virtual
```

2. **Estrutura de arquivos necessária:**
```
projeto/
├── index.html          # Arquivo principal
├── js/
│   ├── simulator.js    # Lógica principal do simulador
│   ├── algorithms.js   # Implementação dos algoritmos
│   └── ui.js          # Funções de interface
└── README.md
```

3. **Abra o arquivo `index.html` no navegador:**
   - **Método 1 - Direto:** Dê duplo clique no arquivo `index.html`

### Bibliotecas Externas
- **Tailwind CSS v3.x** - Framework CSS (carregado via CDN)
  - URL: https://cdn.tailwindcss.com
  - Não requer instalação local

## Arquitetura e Decisões Técnicas

1. **simulator.js**: Núcleo do simulador

2. **algorithms.js**: Implementação dos algoritmos

3. **ui.js**: Interface e visualização


### Decisões de Implementação

1. **JavaScript Vanilla**
2. **CDN para Tailwind**
3. **Animações CSS**

## Guia de Uso

### Configuração Básica

1. **Selecione o número de frames** (2-8 frames recomendados)
2. **Escolha o algoritmo de substituição**
3. **Defina o modo de alocação** (Global ou Local)
4. **Configure a sequência de páginas**

### Modos de Operação

#### Modo Global
- Todos os frames são compartilhados
- Formato de entrada: números separados por vírgula (ex: `1,2,3,4,5`)

#### Modo Local
- Frames divididos entre processos
- Formato de entrada: `processo:página` (ex: `1:2,2:3,1:4`)
- Suporta distribuição igual, proporcional ou customizada

### Controles de Simulação

- **Iniciar**: Prepara e inicia a simulação
- **Próximo Passo**: Executa um acesso por vez
- **Auto Play**: Execução automática com intervalo de 1 segundo
- **Resetar**: Limpa estado e reinicia

## Comparação de Algoritmos

Após executar uma simulação, o sistema compara automaticamente todos os algoritmos com a mesma sequência, apresentando:

- Número absoluto de page faults
- Taxa percentual de falhas
- Identificação do melhor e pior desempenho
- Análise de localidade da sequência
