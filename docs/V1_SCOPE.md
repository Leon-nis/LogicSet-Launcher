# Escopo da V1

## Visao geral

A V1 do LogicSet Launcher sera um aplicativo desktop capaz de manter um catalogo
local de recursos e inicia-los por uma interface unica.

O foco desta versao e validar o fluxo principal: cadastrar, encontrar e abrir um
item com o menor numero possivel de passos.

## Publico inicial

Pessoas que utilizam ferramentas do ambiente LogicSet e querem acesso rapido a
elas a partir de um unico ponto.

## Funcionalidades

### Catalogo

- listar os itens cadastrados;
- exibir nome, descricao curta e icone quando disponivel;
- cadastrar um item informando nome e caminho local;
- editar e remover itens cadastrados;
- manter os dados apos fechar o aplicativo.

### Navegacao

- buscar itens por nome;
- marcar e desmarcar favoritos;
- apresentar favoritos com destaque;
- informar quando uma busca nao tiver resultados.

### Execucao

- abrir o arquivo, executavel ou atalho associado ao item;
- detectar caminhos inexistentes antes da tentativa de abertura;
- apresentar uma mensagem compreensivel quando a execucao falhar.

### Configuracoes

- armazenar as preferencias localmente;
- permitir restaurar as preferencias padrao;
- funcionar sem conta e sem conexao com a internet.

## Requisitos nao funcionais

- interface adequada para uso em desktop;
- inicializacao e navegacao responsivas para um catalogo pequeno;
- dados do usuario armazenados fora dos arquivos da aplicacao;
- erros tratados sem encerrar inesperadamente o aplicativo;
- processo de instalacao e primeira execucao documentado.

## Fora do escopo

Nao fazem parte da V1:

- autenticacao e perfis online;
- sincronizacao em nuvem;
- loja ou marketplace;
- sistema de plugins;
- atualizacao automatica de aplicativos cadastrados;
- download e instalacao de ferramentas;
- telemetria;
- suporte obrigatorio a multiplos sistemas operacionais;
- integracoes remotas que dependam de APIs externas.

## Criterios de aceite

A V1 sera considerada concluida quando:

1. um usuario puder cadastrar um item local;
2. o item continuar disponivel apos reiniciar o launcher;
3. o usuario puder encontra-lo pela busca e marca-lo como favorito;
4. o launcher puder abrir um item com caminho valido;
5. caminhos invalidos e falhas de execucao forem apresentados sem interromper o
   aplicativo;
6. os fluxos principais tiverem testes automatizados;
7. houver instrucoes de instalacao, execucao e uso.

## Decisoes pendentes

- sistemas operacionais suportados;
- stack e framework de interface;
- formato de persistencia local;
- identidade visual;
- estrategia de empacotamento e distribuicao;
- licenca do projeto.
