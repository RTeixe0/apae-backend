# 📋 Cenários de Teste - eventsController

## 📑 Índice

1. [listEvents](#-listevents)
2. [updateEvent](#-updateevent)
3. [deleteEvent](#-deleteevent)

---

## 📋 listEvents

### Cenário 1: Listar todos os eventos com sucesso

**Teste**: deve listar todos os eventos com sucesso

**Como foi testado**:

-   **Mock de dados**: Configurado retorno de 2 eventos com todos os campos preenchidos
    ```javascript
    const mockEvents = [
        {
            id: 1,
            nome: "Evento 1",
            local: "São Paulo",
            data: "2024-12-31",
            starts_at: "10:00:00",
            ends_at: "18:00:00",
            bannerUrl: "https://exemplo.com/banner1.jpg",
            capacity: 100,
            sold_count: 50,
            ticket_price: 25.0,
            status: "published",
            created_at: "2024-01-01T00:00:00.000Z",
            created_by_name: "Admin User",
        },
        {
            id: 2,
            nome: "Evento 2",
            local: "Rio de Janeiro",
            data: "2024-12-25",
            starts_at: null,
            ends_at: null,
            bannerUrl: null,
            capacity: 50,
            sold_count: 10,
            ticket_price: 15.0,
            status: "published",
            created_at: "2024-01-02T00:00:00.000Z",
            created_by_name: null,
        },
    ];
    mockQuery.mockResolvedValue([mockEvents]);
    ```
-   **Chamada**: `await listEvents({}, res)`
-   **Validações executadas**:
    -   Query contém `SELECT`
    -   Query contém `LEFT JOIN users` (para nome do criador)
    -   Query contém `ORDER BY e.data DESC` (ordenação por data)
    -   Status HTTP 200
    -   JSON retornado é igual ao mockEvents

**Resultado**: ✅ **PASSOU**

-   Query SQL corretamente construída com JOIN
-   Eventos ordenados por data (DESC)
-   Retornou array com 2 eventos
-   Status 200 OK
-   Dados completos retornados incluindo campos nulos

---

### Cenário 2: Retornar array vazio quando não há eventos

**Teste**: deve retornar array vazio quando não há eventos

**Como foi testado**:

-   **Mock de dados**: Array vazio
    ```javascript
    mockQuery.mockResolvedValue([[]]);
    ```
-   **Chamada**: `await listEvents({}, res)`
-   **Validações executadas**:
    -   Query foi chamada
    -   Status HTTP 200
    -   JSON retornado é array vazio `[]`

**Resultado**: ✅ **PASSOU**

-   Query executada normalmente
-   Status 200 OK (mesmo sem dados)
-   Array vazio retornado corretamente
-   Não gerou erro ao processar resultado vazio

---

### Cenário 3: Retornar erro 500 quando banco falhar

**Teste**: deve retornar erro 500 quando banco falhar

**Como foi testado**:

-   **Mock de erro**: Simula falha de conexão
    ```javascript
    mockQuery.mockRejectedValue(new Error("Database connection error"));
    ```
-   **Chamada**: `await listEvents({}, res)`
-   **Validações executadas**:
    -   Query foi chamada
    -   Status HTTP 500
    -   JSON retornado contém mensagem de erro

**Resultado**: ✅ **PASSOU**

-   Erro capturado corretamente
-   Status 500 Internal Server Error
-   Mensagem: "Erro interno ao listar eventos."
-   Erro logado no console
-   Não expôs detalhes técnicos ao cliente

---

## 🔄 updateEvent

### Cenário 1: Atualizar evento existente com sucesso

**Teste**: deve atualizar evento existente com sucesso

**Como foi testado**:

-   **Setup**:
    ```javascript
    req.params = { id: "1" };
    req.user = { groups: ["admin"] };
    req.body = {
        nome: "Evento Atualizado",
        local: "Belo Horizonte",
        data: "2025-01-15",
        capacity: 200,
    };
    ```
-   **Mock de dados**:
    ```javascript
    // 1ª query: verifica se evento existe
    mockQuery.mockResolvedValueOnce([[{ id: 1 }]]);
    // 2ª query: atualiza o evento
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);
    ```
-   **Chamada**: `await updateEvent(req, res)`
-   **Validações executadas**:
    -   2 queries executadas
    -   1ª query: `SELECT id FROM events WHERE id = ?` com `["1"]`
    -   2ª query: `UPDATE events` com todos os campos
    -   Parâmetros incluem: nome, local, data formatada, capacity
    -   Status HTTP 200
    -   Mensagem de sucesso retornada

**Resultado**: ✅ **PASSOU**

-   Evento verificado antes de atualizar
-   Todos os campos atualizados corretamente
-   Data formatada para banco
-   Status 200 OK
-   Mensagem: "Evento atualizado com sucesso!"

---

### Cenário 2: Atualizar apenas campos fornecidos (COALESCE)

**Teste**: deve atualizar apenas campos fornecidos (COALESCE)

**Como foi testado**:

-   **Setup**:
    ```javascript
    req.body = {
        nome: "Novo Nome",
        // Apenas nome fornecido, outros campos undefined
    };
    ```
-   **Mock de dados**:
    ```javascript
    mockQuery.mockResolvedValueOnce([[{ id: 1 }]]);
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);
    ```
-   **Chamada**: `await updateEvent(req, res)`
-   **Validações executadas**:
    -   Query contém `COALESCE`
    -   Parâmetros: `["Novo Nome", null, null, null, ...]`
    -   Campos não fornecidos enviados como `null`
    -   Status HTTP 200

**Resultado**: ✅ **PASSOU**

-   Query SQL usa `COALESCE` corretamente
-   Apenas campos fornecidos são atualizados
-   Campos omitidos permanecem inalterados no banco
-   Lógica de atualização parcial funciona
-   Status 200 OK

---

### Cenário 3: Formatar data corretamente quando fornecida

**Teste**: deve formatar data corretamente quando fornecida

**Como foi testado**:

-   **Setup**:
    ```javascript
    req.body = {
        data: "2025-06-15",
    };
    ```
-   **Mock de dados**:
    ```javascript
    mockQuery.mockResolvedValueOnce([[{ id: 1 }]]);
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);
    ```
-   **Chamada**: `await updateEvent(req, res)`
-   **Validações executadas**:
    -   Parâmetros contém string formatada na posição da data
    -   Outros campos são `null`
    -   Status HTTP 200

**Resultado**: ✅ **PASSOU**

-   Data "2025-06-15" processada pela função `formatLocalDate()`
-   Convertida para formato do banco
-   Outros campos preservados
-   Status 200 OK

---

### Cenário 4: Retornar erro 403 quando usuário não é admin

**Teste**: deve retornar erro 403 quando usuário não é admin

**Como foi testado**:

-   **Setup**:
    ```javascript
    req.user = { groups: ["staff"] }; // staff não pode editar
    req.body = { nome: "Novo Nome" };
    ```
-   **Chamada**: `await updateEvent(req, res)`
-   **Validações executadas**:
    -   Query NÃO foi chamada
    -   Status HTTP 403
    -   Mensagem de erro específica

**Resultado**: ✅ **PASSOU**

-   Validação de permissão executada ANTES da query
-   Query não executada (eficiência)
-   Status 403 Forbidden
-   Mensagem: "Acesso negado. Apenas administradores podem editar eventos."

---

### Cenário 5: Retornar erro 404 quando evento não existe (primeira query)

**Teste**: deve retornar erro 404 quando evento não existe (primeira query)

**Como foi testado**:

-   **Setup**:
    ```javascript
    req.user = { groups: ["admin"] };
    req.body = { nome: "Novo Nome" };
    ```
-   **Mock de dados**:
    ```javascript
    mockQuery.mockResolvedValueOnce([[]]); // Evento não encontrado
    ```
-   **Chamada**: `await updateEvent(req, res)`
-   **Validações executadas**:
    -   Apenas 1 query executada (verificação)
    -   Status HTTP 404
    -   Mensagem de erro retornada

**Resultado**: ✅ **PASSOU**

-   Primeira query verifica existência
-   Array vazio detectado
-   UPDATE não executado
-   Status 404 Not Found
-   Mensagem: "Evento não encontrado."

---

### Cenário 6: Retornar erro 404 quando affectedRows é 0

**Teste**: deve retornar erro 404 quando affectedRows é 0

**Como foi testado**:

-   **Setup**:
    ```javascript
    req.user = { groups: ["admin"] };
    req.body = { nome: "Novo Nome" };
    ```
-   **Mock de dados**:
    ```javascript
    // Evento existe
    mockQuery.mockResolvedValueOnce([[{ id: 999 }]]);
    // UPDATE não afetou nenhuma linha (caso raro)
    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }]);
    ```
-   **Chamada**: `await updateEvent(req, res)`
-   **Validações executadas**:
    -   2 queries executadas
    -   Status HTTP 404
    -   Mensagem de erro retornada

**Resultado**: ✅ **PASSOU**

-   Evento passou na verificação inicial
-   UPDATE executado mas não afetou linhas
-   `affectedRows: 0` detectado
-   Status 404 Not Found
-   Trata condição de corrida ou exclusão concorrente

---

### Cenário 7: Retornar erro 500 quando banco falhar na verificação

**Teste**: deve retornar erro 500 quando banco falhar na verificação

**Como foi testado**:

-   **Setup**:
    ```javascript
    req.params = { id: "1" };
    req.user = { groups: ["admin"] };
    req.body = { nome: "Novo Nome" };
    ```
-   **Mock de erro**:
    ```javascript
    mockQuery.mockRejectedValue(new Error("Connection timeout"));
    ```
-   **Chamada**: `await updateEvent(req, res)`
-   **Validações executadas**:
    -   Status HTTP 500
    -   Mensagem de erro genérica

**Resultado**: ✅ **PASSOU**

-   Erro capturado no bloco try-catch
-   Status 500 Internal Server Error
-   Mensagem: "Erro interno ao atualizar evento."
-   Detalhes técnicos não expostos

---

### Cenário 8: Retornar erro 500 quando banco falhar no update

**Teste**: deve retornar erro 500 quando banco falhar no update

**Como foi testado**:

-   **Setup**:
    ```javascript
    req.params = { id: "1" };
    req.user = { groups: ["admin"] };
    req.body = { nome: "Novo Nome" };
    ```
-   **Mock de dados**:
    ```javascript
    mockQuery.mockResolvedValueOnce([[{ id: 1 }]]); // Verificação OK
    mockQuery.mockRejectedValueOnce(new Error("Update failed")); // UPDATE falha
    ```
-   **Chamada**: `await updateEvent(req, res)`
-   **Validações executadas**:
    -   Status HTTP 500
    -   Mensagem de erro genérica

**Resultado**: ✅ **PASSOU**

-   Primeira query executada com sucesso
-   Segunda query (UPDATE) falhou
-   Erro capturado
-   Status 500 Internal Server Error
-   Mensagem: "Erro interno ao atualizar evento."

---

## 🗑️ deleteEvent

### Cenário 1: Excluir evento existente com sucesso

**Teste**: deve excluir evento existente com sucesso

**Como foi testado**:

-   **Setup**:
    ```javascript
    req.params = { id: "1" };
    req.user = { groups: ["admin"] };
    ```
-   **Mock de dados**:
    ```javascript
    mockQuery.mockResolvedValue([{ affectedRows: 1 }]);
    ```
-   **Chamada**: `await deleteEvent(req, res)`
-   **Validações executadas**:
    -   Query executada: `DELETE FROM events WHERE id = ?`
    -   Parâmetro: `["1"]`
    -   Status HTTP 200
    -   Mensagem de sucesso retornada

**Resultado**: ✅ **PASSOU**

-   Query DELETE executada corretamente
-   ID correto usado (1)
-   1 linha afetada
-   Status 200 OK
-   Mensagem: "Evento excluído com sucesso!"

---

### Cenário 2: Usar o id correto dos params

**Teste**: deve usar o id correto dos params

**Como foi testado**:

-   **Setup**:
    ```javascript
    req.params = { id: "42" };
    req.user = { groups: ["admin"] };
    ```
-   **Mock de dados**:
    ```javascript
    mockQuery.mockResolvedValue([{ affectedRows: 1 }]);
    ```
-   **Chamada**: `await deleteEvent(req, res)`
-   **Validações executadas**:
    -   Query chamada com parâmetro `["42"]`
    -   Status HTTP 200

**Resultado**: ✅ **PASSOU**

-   ID "42" extraído corretamente de `req.params`
-   Query DELETE usa ID correto
-   Validação de parâmetro funciona
-   Status 200 OK

---

### Cenário 3: Retornar erro 403 quando usuário não é admin

**Teste**: deve retornar erro 403 quando usuário não é admin

**Como foi testado**:

-   **Setup**:
    ```javascript
    req.params = { id: "1" };
    req.user = { groups: ["staff"] }; // staff não pode excluir
    ```
-   **Chamada**: `await deleteEvent(req, res)`
-   **Validações executadas**:
    -   Query NÃO foi chamada
    -   Status HTTP 403
    -   Mensagem de erro específica

**Resultado**: ✅ **PASSOU**

-   Validação de permissão executada ANTES da query
-   Apenas admin pode excluir
-   staff não tem permissão
-   Status 403 Forbidden
-   Mensagem: "Acesso negado. Apenas administradores podem excluir eventos."

---

### Cenário 4: Retornar erro 403 quando usuário não tem grupos

**Teste**: deve retornar erro 403 quando usuário não tem grupos

**Como foi testado**:

-   **Setup**:
    ```javascript
    req.params = { id: "1" };
    req.user = { groups: [] }; // Array vazio
    ```
-   **Chamada**: `await deleteEvent(req, res)`
-   **Validações executadas**:
    -   Query NÃO foi chamada
    -   Status HTTP 403

**Resultado**: ✅ **PASSOU**

-   Usuário sem grupos detectado
-   Query não executada
-   Status 403 Forbidden
-   Validação de array vazio funciona

---

### Cenário 5: Retornar erro 404 quando evento não existe

**Teste**: deve retornar erro 404 quando evento não existe

**Como foi testado**:

-   **Setup**:
    ```javascript
    req.params = { id: "1" };
    req.user = { groups: ["admin"] };
    ```
-   **Mock de dados**:
    ```javascript
    mockQuery.mockResolvedValue([{ affectedRows: 0 }]); // Nenhuma linha afetada
    ```
-   **Chamada**: `await deleteEvent(req, res)`
-   **Validações executadas**:
    -   Query foi chamada
    -   Status HTTP 404
    -   Mensagem de erro retornada

**Resultado**: ✅ **PASSOU**

-   Query DELETE executada
-   `affectedRows: 0` indica evento inexistente
-   Status 404 Not Found
-   Mensagem: "Evento não encontrado."
-   Não gerou erro ao tentar deletar inexistente

---

### Cenário 6: Retornar erro 500 quando banco falhar

**Teste**: deve retornar erro 500 quando banco falhar

**Como foi testado**:

-   **Setup**:
    ```javascript
    req.params = { id: "1" };
    req.user = { groups: ["admin"] };
    ```
-   **Mock de erro**:
    ```javascript
    mockQuery.mockRejectedValue(new Error("Foreign key constraint"));
    ```
-   **Chamada**: `await deleteEvent(req, res)`
-   **Validações executadas**:
    -   Query foi chamada
    -   Status HTTP 500
    -   Mensagem de erro genérica

**Resultado**: ✅ **PASSOU**

-   Erro capturado (ex: foreign key constraint)
-   Status 500 Internal Server Error
-   Mensagem: "Erro interno ao excluir evento."
-   Detalhes técnicos não expostos ao cliente
-   Trata casos como evento com tickets associados

---

## 📊 Resumo Geral

### listEvents

-   ✅ **3 cenários testados**
-   ✅ **3/3 passando (100%)**
-   Cobertura: Happy path, array vazio, erro de banco

### updateEvent

-   ✅ **8 cenários testados**
-   ✅ **8/8 passando (100%)**
-   Cobertura: Atualização completa, parcial, validações de permissão, erros

### deleteEvent

-   ✅ **6 cenários testados**
-   ✅ **6/6 passando (100%)**
-   Cobertura: Exclusão bem-sucedida, validações de permissão, evento inexistente, erros

### Total

-   ✅ **17 cenários testados**
-   ✅ **17/17 passando (100%)**
-   ✅ **0 falhas**

---

## 🎯 Pontos Fortes Identificados

### listEvents

1. ✅ JOIN com tabela users implementado
2. ✅ Ordenação por data (DESC)
3. ✅ Tratamento de array vazio
4. ✅ Tratamento de erros de banco

### updateEvent

1. ✅ Verificação de existência antes de atualizar
2. ✅ Atualização parcial com COALESCE
3. ✅ Formatação de data
4. ✅ Validação de permissões (apenas admin)
5. ✅ Detecção de affectedRows = 0
6. ✅ Tratamento de erros em ambas as queries

### deleteEvent

1. ✅ Validação de permissões (apenas admin)
2. ✅ Uso correto de params
3. ✅ Detecção de evento inexistente (affectedRows = 0)
4. ✅ Tratamento de foreign key constraints
5. ✅ Validação de array vazio em groups

---

## 📝 Observações Importantes

### Padrão de Testes

-   Todos seguem estrutura: **Happy Path → Validação → Erro**
-   Mocks bem definidos e específicos
-   Validações detalhadas de queries SQL
-   Assertions verificam status HTTP e mensagens

### Segurança

-   Validações de permissão executadas ANTES das queries
-   Mensagens de erro não expõem detalhes técnicos
-   Tratamento adequado de erros de banco

### Qualidade

-   100% dos testes passando
-   Cobertura completa de cenários
-   Edge cases testados (array vazio, affectedRows = 0)
-   Erros de banco simulados e tratados

---

**Documentação gerada em**: 16/11/2025  
**Versão**: 1.0  
**Status**: ✅ Completo e Validado
