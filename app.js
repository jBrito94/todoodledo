document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const todoInput = document.getElementById("todo-input");
  const addTodoBtn = document.getElementById("add-todo-btn");
  const todoList = document.getElementById("todo-list");
  const editDialog = document.getElementById("edit-dialog");
  const editTodoInput = document.getElementById("edit-todo-input");
  const saveEditBtn = document.getElementById("save-edit-btn");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");

  // State
  let todos = [];
  let currentEditTodoId = null;

  // Load todos from localStorage
  const loadTodos = () => {
    const storedTodos = localStorage.getItem("todos");
    if (storedTodos) {
      todos = JSON.parse(storedTodos);
      renderTodos();
    }
  };

  // Save todos to localStorage
  const saveTodos = () => {
    localStorage.setItem("todos", JSON.stringify(todos));
  };

  // Generate unique ID for todos
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  // Add new todo
  const addTodo = () => {
    const text = todoInput.value.trim();
    if (text === "") return;

    const newTodo = {
      id: generateId(),
      text: text,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    todos.push(newTodo);
    saveTodos();
    renderTodos();

    todoInput.value = "";
  };

  // Delete todo
  const deleteTodo = (id) => {
    todos = todos.filter((todo) => todo.id !== id);
    saveTodos();
    renderTodos();
  };

  // Toggle todo completion
  const toggleTodoComplete = (id) => {
    todos = todos.map((todo) => {
      if (todo.id === id) {
        return { ...todo, completed: !todo.completed };
      }
      return todo;
    });
    saveTodos();
    renderTodos();
  };

  // Edit todo
  const editTodo = (id) => {
    const todo = todos.find((todo) => todo.id === id);
    if (!todo) return;

    currentEditTodoId = id;
    editTodoInput.value = todo.text;
    editDialog.show();
  };

  // Save edited todo
  const saveEditedTodo = () => {
    const text = editTodoInput.value.trim();
    if (text === "") return;

    todos = todos.map((todo) => {
      if (todo.id === currentEditTodoId) {
        return { ...todo, text: text };
      }
      return todo;
    });

    saveTodos();
    renderTodos();
    editDialog.hide();
  };

  // Render todos
  const renderTodos = () => {
    todoList.innerHTML = "";

    if (todos.length === 0) {
      const emptyMessage = document.createElement("div");
      emptyMessage.className = "empty-message";
      emptyMessage.textContent = "No todos yet. Add one above!";
      todoList.appendChild(emptyMessage);
      return;
    }

    todos.forEach((todo) => {
      const todoItem = document.createElement("div");
      todoItem.className = `todo-item ${todo.completed ? "completed" : ""}`;
      todoItem.dataset.id = todo.id;

      const todoContent = document.createElement("div");
      todoContent.className = "todo-content";

      const checkbox = document.createElement("sl-checkbox");
      checkbox.checked = todo.completed;
      checkbox.addEventListener("sl-change", () => toggleTodoComplete(todo.id));

      const todoText = document.createElement("div");
      todoText.className = "todo-text";
      todoText.textContent = todo.text;

      todoContent.appendChild(checkbox);
      todoContent.appendChild(todoText);

      const todoActions = document.createElement("div");
      todoActions.className = "todo-actions";

      const editButton = document.createElement("sl-button");
      editButton.size = "small";
      editButton.innerHTML = '<sl-icon name="pencil"></sl-icon>';
      editButton.addEventListener("click", () => editTodo(todo.id));

      const deleteButton = document.createElement("sl-button");
      deleteButton.size = "small";
      deleteButton.variant = "danger";
      deleteButton.innerHTML = '<sl-icon name="trash"></sl-icon>';
      deleteButton.addEventListener("click", () => deleteTodo(todo.id));

      todoActions.appendChild(editButton);
      todoActions.appendChild(deleteButton);

      todoItem.appendChild(todoContent);
      todoItem.appendChild(todoActions);

      todoList.appendChild(todoItem);
    });
  };

  // Event Listeners
  addTodoBtn.addEventListener("click", addTodo);

  todoInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addTodo();
  });

  saveEditBtn.addEventListener("click", saveEditedTodo);

  cancelEditBtn.addEventListener("click", () => {
    editDialog.hide();
  });

  // Initialize
  loadTodos();
});
