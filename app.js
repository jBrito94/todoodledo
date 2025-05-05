document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const todoInput = document.getElementById("todo-input");
  const addTodoBtn = document.getElementById("add-todo-btn");
  const todoList = document.getElementById("todo-list");
  const clockElement = document.getElementById("clock");

  // Clock functionality with improved formatting
  function updateClock() {
    const now = new Date();
    const dateOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };

    const timeOptions = {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    };

    const dateStr = now.toLocaleDateString("en-US", dateOptions);
    const timeStr = now.toLocaleTimeString("en-US", timeOptions);

    clockElement.innerHTML = `
      <span class="date">${dateStr}</span>
      <span class="time">${timeStr}</span>
    `;
  }

  // Initialize and update clock every second
  updateClock();
  setInterval(updateClock, 1000);

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

  // Format relative time
  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
      return "just now";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? "s" : ""} ago`;
    }
  };

  // Create toast message helper function
  const showToast = (variant, message, icon, duration = 3000) => {
    // Remove any existing toasts to prevent stacking
    document.querySelectorAll("sl-toast").forEach((toast) => {
      toast.hide();
      setTimeout(() => {
        toast.remove();
      }, 300);
    });

    const toast = Object.assign(document.createElement("sl-toast"), {
      variant: variant,
      duration: duration,
      innerHTML: `
        <div style="display: flex; align-items: center; gap: 8px;">
          <sl-icon name="${icon}"></sl-icon>
          <span>${message}</span>
        </div>
      `,
    });

    // Add to app-wrapper instead of body to keep it within the card
    const appWrapper = document.querySelector(".app-wrapper");
    appWrapper.appendChild(toast);
    toast.toast();
  };

  // Add new todo with animation
  const addTodo = () => {
    const text = todoInput.value.trim();
    if (text === "") {
      // Show validation feedback with Shoelace toast and shake animation
      todoInput.focus();
      todoInput.style.animation = "shake 0.5s";
      setTimeout(() => {
        todoInput.style.animation = "";
      }, 500);

      showToast(
        "warning",
        "Please enter a task before adding",
        "exclamation-triangle"
      );
      return;
    }

    const newTodo = {
      id: generateId(),
      text: text,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    // Add at the beginning for better UX
    todos.unshift(newTodo);
    saveTodos();
    renderTodos();

    // Success feedback
    showToast("success", "Task added successfully!", "check-circle", 2000);

    todoInput.value = "";
    todoInput.focus();
  };

  // Delete todo with confirmation
  const deleteTodo = (id) => {
    // Create and show confirmation dialog
    const confirmDialog = Object.assign(document.createElement("sl-dialog"), {
      label: "Confirm Deletion",
      innerHTML: `
        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
          <sl-icon name="trash" style="font-size: 2rem; color: var(--accent-red);"></sl-icon>
          <div>
            <p>Are you sure you want to delete this task?</p>
            <p style="opacity: 0.7; font-size: 0.9rem; margin-top: 5px;">This action cannot be undone.</p>
          </div>
        </div>
        <div slot="footer" style="display: flex; gap: 10px; justify-content: flex-end; width: 100%;">
          <sl-button variant="default">Cancel</sl-button>
          <sl-button variant="danger">
            <sl-icon name="trash"></sl-icon> Delete
          </sl-button>
        </div>
      `,
    });

    document.body.appendChild(confirmDialog);

    // Get dialog buttons
    const cancelBtn = confirmDialog.querySelector(
      'sl-button[variant="default"]'
    );
    const deleteBtn = confirmDialog.querySelector(
      'sl-button[variant="danger"]'
    );

    // Add event listeners
    cancelBtn.addEventListener("click", () => confirmDialog.hide());
    deleteBtn.addEventListener("click", () => {
      // Remove with animation before actually deleting
      const todoEl = document.querySelector(`.todo-item[data-id="${id}"]`);
      todoEl.style.animation = "fadeOut 0.4s forwards";

      setTimeout(() => {
        todos = todos.filter((todo) => todo.id !== id);
        saveTodos();
        renderTodos();
        confirmDialog.hide();

        // Show delete success notification
        showToast("danger", "Task deleted", "trash", 2000);
      }, 400);
    });

    confirmDialog.show();
  };

  // Toggle todo completion with animation
  const toggleTodoComplete = (id) => {
    let isComplete = false;
    todos = todos.map((todo) => {
      if (todo.id === id) {
        isComplete = !todo.completed;
        return { ...todo, completed: isComplete };
      }
      return todo;
    });
    saveTodos();

    // Apply animation before re-rendering
    const todoEl = document.querySelector(`.todo-item[data-id="${id}"]`);
    todoEl.style.animation = "pulse 0.4s";

    setTimeout(() => {
      renderTodos();

      // Show status change notification
      showToast(
        isComplete ? "success" : "primary",
        `Task marked as ${isComplete ? "complete" : "incomplete"}`,
        isComplete ? "check-circle" : "arrow-counterclockwise",
        2000
      );
    }, 400);
  };

  // Edit todo
  const editTodo = (id) => {
    const todo = todos.find((todo) => todo.id === id);
    if (!todo) return;

    // Completely different approach: use a modal window instead of sl-dialog
    // Create a modal wrapper that sits on top of everything
    const modalOverlay = document.createElement("div");
    modalOverlay.className = "modal-overlay";
    modalOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999999;
      backdrop-filter: blur(8px);
    `;

    // Create the actual modal content
    const modalContent = document.createElement("div");
    modalContent.className = "modal-content";
    modalContent.style.cssText = `
      background-color: var(--bg-surface);
      padding: 24px;
      border-radius: 16px;
      width: 90%;
      max-width: 450px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.05);
      position: relative;
      z-index: 10000000;
    `;

    // Create header
    const modalHeader = document.createElement("div");
    modalHeader.style.cssText = `
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 20px;
      color: var(--text-color);
    `;
    modalHeader.textContent = "Edit Task";

    // Create input field
    const inputContainer = document.createElement("div");
    inputContainer.style.cssText = `margin-bottom: 24px; position: relative;`;

    const input = document.createElement("input");
    input.type = "text";
    input.value = todo.text;
    input.style.cssText = `
      width: 100%;
      padding: 14px 20px 14px 50px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background-color: var(--bg-component);
      color: var(--text-color);
      font-family: 'Inter', sans-serif;
      font-size: 1rem;
      outline: none;
      box-sizing: border-box;
      font-weight: 500;
    `;

    const icon = document.createElement("div");
    icon.style.cssText = `
      position: absolute;
      left: 15px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--primary-color);
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    icon.innerHTML = '<sl-icon name="pencil"></sl-icon>';

    // Create footer with buttons
    const modalFooter = document.createElement("div");
    modalFooter.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    `;

    const cancelButton = document.createElement("button");
    cancelButton.innerHTML = '<sl-icon name="x"></sl-icon> Cancel';
    cancelButton.style.cssText = `
      padding: 10px 20px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background-color: transparent;
      color: var(--text-color);
      font-family: 'Inter', sans-serif;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-width: 100px;
      transition: all 0.2s ease;
    `;

    const saveButton = document.createElement("button");
    saveButton.innerHTML = '<sl-icon name="check2"></sl-icon> Save';
    saveButton.style.cssText = `
      padding: 10px 20px;
      border-radius: 8px;
      border: none;
      background: var(--gradient-primary);
      color: white;
      font-family: 'Inter', sans-serif;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-width: 100px;
      transition: all 0.2s ease;
    `;

    // Hover effects
    cancelButton.onmouseover = () => {
      cancelButton.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
    };
    cancelButton.onmouseout = () => {
      cancelButton.style.backgroundColor = "transparent";
    };

    saveButton.onmouseover = () => {
      saveButton.style.transform = "translateY(-2px)";
      saveButton.style.boxShadow =
        "0 6px 24px rgba(0, 0, 0, 0.2), 0 0 15px rgba(138, 99, 210, 0.4)";
    };
    saveButton.onmouseout = () => {
      saveButton.style.transform = "translateY(0)";
      saveButton.style.boxShadow = "none";
    };

    // Assemble the modal
    inputContainer.appendChild(input);
    inputContainer.appendChild(icon);

    modalFooter.appendChild(cancelButton);
    modalFooter.appendChild(saveButton);

    modalContent.appendChild(modalHeader);
    modalContent.appendChild(inputContainer);
    modalContent.appendChild(modalFooter);

    modalOverlay.appendChild(modalContent);

    // Add it to the body
    document.body.appendChild(modalOverlay);

    // Function to close the modal
    const closeModal = () => {
      modalOverlay.style.opacity = "0";
      setTimeout(() => {
        document.body.removeChild(modalOverlay);
      }, 200);
    };

    // Event listeners
    const handleSave = () => {
      const text = input.value.trim();
      if (text === "") {
        input.style.animation = "shake 0.5s";
        setTimeout(() => {
          input.style.animation = "";
        }, 500);

        showToast("warning", "Task cannot be empty", "exclamation-triangle");
        return;
      }

      todos = todos.map((todo) => {
        if (todo.id === id) {
          return { ...todo, text: text };
        }
        return todo;
      });

      saveTodos();
      renderTodos();
      closeModal();

      showToast("success", "Task updated successfully!", "pencil-square", 2000);

      // Highlight the edited item
      setTimeout(() => {
        const todoEl = document.querySelector(`.todo-item[data-id="${id}"]`);
        if (todoEl) {
          todoEl.style.animation = "pulse 0.4s";
          todoEl.style.boxShadow = "var(--shadow-glow)";
          setTimeout(() => {
            todoEl.style.boxShadow = "";
          }, 1500);
        }
      }, 100);
    };

    // Event listeners
    cancelButton.addEventListener("click", closeModal);
    saveButton.addEventListener("click", handleSave);

    // Close on overlay click (but not content click)
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        closeModal();
      }
    });

    // Handle Enter key
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        handleSave();
      }
    });

    // Add a subtle fade-in effect
    modalOverlay.style.opacity = "0";
    setTimeout(() => {
      modalOverlay.style.opacity = "1";
      modalOverlay.style.transition = "opacity 0.2s ease";

      // Focus the input and select text
      input.focus();
      input.setSelectionRange(0, input.value.length);
    }, 10);
  };

  // Render todos
  const renderTodos = () => {
    todoList.innerHTML = "";

    if (todos.length === 0) {
      const emptyMessage = document.createElement("div");
      emptyMessage.className = "empty-message";
      emptyMessage.innerHTML = `
        <sl-icon name="journal-check"></sl-icon>
        <p>Your task list is empty</p>
        <p style="opacity: 0.7; font-size: 0.9rem;">Add a new task to get started</p>
      `;
      todoList.appendChild(emptyMessage);
      return;
    }

    // Sort todos by completed status and creation date
    const sortedTodos = [...todos].sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1; // Uncompleted first
      }
      // Sort by date (newer first) if completion status is the same
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    sortedTodos.forEach((todo, index) => {
      const todoItem = document.createElement("div");
      todoItem.className = `todo-item ${todo.completed ? "completed" : ""}`;
      todoItem.dataset.id = todo.id;
      // Add staggered animation delay for smoother list appearance
      todoItem.style.animation = `fadeIn 0.4s ${index * 0.05}s backwards`;

      const todoContent = document.createElement("div");
      todoContent.className = "todo-content";

      const checkbox = document.createElement("sl-checkbox");
      checkbox.checked = todo.completed;
      checkbox.addEventListener("sl-change", () => toggleTodoComplete(todo.id));

      const todoTextContainer = document.createElement("div");
      todoTextContainer.className = "todo-text-container";

      const todoText = document.createElement("div");
      todoText.className = "todo-text";
      todoText.textContent = todo.text;

      const todoTime = document.createElement("div");
      todoTime.className = "todo-time";
      todoTime.innerHTML = `
        <sl-icon name="clock"></sl-icon>
        ${formatRelativeTime(todo.createdAt)}
      `;

      todoTextContainer.appendChild(todoText);
      todoTextContainer.appendChild(todoTime);

      todoContent.appendChild(checkbox);
      todoContent.appendChild(todoTextContainer);

      const todoActions = document.createElement("div");
      todoActions.className = "todo-actions";

      const editButton = document.createElement("sl-button");
      editButton.size = "small";
      editButton.variant = "default";
      editButton.innerHTML = '<sl-icon name="pencil"></sl-icon>';
      editButton.addEventListener("click", () => editTodo(todo.id));
      editButton.title = "Edit Task";

      const deleteButton = document.createElement("sl-button");
      deleteButton.size = "small";
      deleteButton.variant = "danger";
      deleteButton.innerHTML = '<sl-icon name="trash"></sl-icon>';
      deleteButton.addEventListener("click", () => deleteTodo(todo.id));
      deleteButton.title = "Delete Task";

      todoActions.appendChild(editButton);
      todoActions.appendChild(deleteButton);

      todoItem.appendChild(todoContent);
      todoItem.appendChild(todoActions);

      todoList.appendChild(todoItem);
    });
  };

  // Event Listeners - simplified since dialog handling is now done in the edit functions
  addTodoBtn.addEventListener("click", addTodo);

  todoInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addTodo();
  });

  // Add CSS animations dynamically
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes fadeOut {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(-20px); }
    }
    
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.02); }
      100% { transform: scale(1); }
    }
    
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
      20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
  `;
  document.head.appendChild(styleSheet);

  // Initialize
  loadTodos();

  // Focus input on load for better UX
  setTimeout(() => {
    todoInput.focus();
  }, 500);
});
