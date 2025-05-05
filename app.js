document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const todoInput = document.getElementById("todo-input");
  const addTodoBtn = document.getElementById("add-todo-btn");
  const todoList = document.getElementById("todo-list");
  const clockElement = document.getElementById("clock");

  // Variables for drag and drop
  let draggedItem = null;
  let draggedItemId = null;

  // Track completed section collapse state
  let isCompletedSectionCollapsed = true;

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

  // Create notification dialog instead of toast
  const showNotification = (variant, message, icon, duration = 3000) => {
    // Remove any existing notifications
    document.querySelectorAll(".notification-dialog").forEach((dialog) => {
      dialog.style.opacity = "0";
      setTimeout(() => {
        if (dialog.parentNode) {
          dialog.parentNode.removeChild(dialog);
        }
      }, 300);
    });

    // Create notification dialog
    const dialog = document.createElement("div");
    dialog.className = "notification-dialog";
    dialog.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: var(--bg-surface);
      border-radius: 12px;
      padding: 16px 20px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 10000000;
      min-width: 300px;
      max-width: 90%;
      width: auto;
      border-left: 4px solid ${
        variant === "success"
          ? "var(--accent-green)"
          : variant === "warning"
          ? "var(--accent-yellow)"
          : variant === "danger"
          ? "var(--accent-red)"
          : "var(--primary-color)"
      };
      opacity: 0;
      transition: opacity 0.3s ease, transform 0.3s ease;
    `;

    const contentWrapper = document.createElement("div");
    contentWrapper.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
    `;

    const iconEl = document.createElement("div");
    iconEl.style.cssText = `
      font-size: 1.5rem;
      color: ${
        variant === "success"
          ? "var(--accent-green)"
          : variant === "warning"
          ? "var(--accent-yellow)"
          : variant === "danger"
          ? "var(--accent-red)"
          : "var(--primary-color)"
      };
      flex-shrink: 0;
    `;
    iconEl.innerHTML = `<sl-icon name="${icon}"></sl-icon>`;

    const messageEl = document.createElement("div");
    messageEl.style.cssText = `
      font-size: 1rem;
      font-weight: 500;
      color: var(--text-color);
      flex-grow: 1;
    `;
    messageEl.textContent = message;

    const closeBtn = document.createElement("button");
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: var(--text-tertiary);
      cursor: pointer;
      margin-left: 16px;
      padding: 4px;
      font-size: 1.2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s ease;
      flex-shrink: 0;
    `;
    closeBtn.innerHTML = '<sl-icon name="x"></sl-icon>';
    closeBtn.addEventListener("click", () => {
      dialog.style.opacity = "0";
      dialog.style.transform = "translateX(-50%) translateY(-20px)";
      setTimeout(() => {
        if (dialog.parentNode) {
          dialog.parentNode.removeChild(dialog);
        }
      }, 300);
    });

    closeBtn.onmouseover = () => {
      closeBtn.style.color = "var(--text-color)";
    };
    closeBtn.onmouseout = () => {
      closeBtn.style.color = "var(--text-tertiary)";
    };

    contentWrapper.appendChild(iconEl);
    contentWrapper.appendChild(messageEl);

    dialog.appendChild(contentWrapper);
    dialog.appendChild(closeBtn);

    document.body.appendChild(dialog);

    // Animate in
    setTimeout(() => {
      dialog.style.opacity = "1";
      dialog.style.transform = "translateX(-50%) translateY(0)";
    }, 10);

    // Auto dismiss
    if (duration) {
      setTimeout(() => {
        dialog.style.opacity = "0";
        dialog.style.transform = "translateX(-50%) translateY(-20px)";
        setTimeout(() => {
          if (dialog.parentNode) {
            dialog.parentNode.removeChild(dialog);
          }
        }, 300);
      }, duration);
    }
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

    // Instead of updating just this item, re-render the whole list
    // This ensures the event listeners are properly updated
    renderTodos();

    // Show status change notification
    showNotification(
      isComplete ? "success" : "primary",
      `Task marked as ${isComplete ? "complete" : "incomplete"}`,
      isComplete ? "check-circle" : "arrow-counterclockwise",
      2000
    );

    // Apply highlight effect to the toggled item after re-rendering
    setTimeout(() => {
      const todoEl = document.querySelector(`.todo-item[data-id="${id}"]`);
      if (todoEl) {
        todoEl.style.animation = "pulse 0.4s";
      }
    }, 0);
  };

  // Add new todo with animation
  const addTodo = () => {
    const text = todoInput.value.trim();
    if (text === "") {
      // Show validation feedback with shake animation
      todoInput.focus();
      todoInput.style.animation = "shake 0.5s";
      setTimeout(() => {
        todoInput.style.animation = "";
      }, 500);

      showNotification(
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
    showNotification(
      "success",
      "Task added successfully!",
      "check-circle",
      2000
    );

    todoInput.value = "";
    todoInput.focus();
  };

  // Delete todo with confirmation
  const deleteTodo = (id) => {
    // Create and show confirmation dialog
    const confirmDialog = Object.assign(document.createElement("div"), {
      className: "modal-overlay",
      style: `
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
      `,
    });

    const confirmContent = document.createElement("div");
    confirmContent.className = "modal-content";
    confirmContent.style = `
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

    confirmContent.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 15px; margin-bottom: 20px;">
        <div style="color: var(--accent-red); font-size: 2rem; margin-top: 3px;">
          <sl-icon name="trash"></sl-icon>
        </div>
        <div>
          <div style="font-size: 1.2rem; font-weight: 600; margin-bottom: 8px; color: var(--text-color);">
            Delete Task
          </div>
          <p style="margin: 0; color: var(--text-secondary);">Are you sure you want to delete this task?</p>
          <p style="margin-top: 8px; color: var(--text-tertiary); font-size: 0.9rem;">This action cannot be undone.</p>
        </div>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 12px;">
        <button id="cancel-delete" style="
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
        ">
          <sl-icon name="x"></sl-icon> Cancel
        </button>
        <button id="confirm-delete" style="
          padding: 10px 20px;
          border-radius: 8px;
          border: none;
          background: linear-gradient(135deg, #e94560, #c33149);
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
        ">
          <sl-icon name="trash"></sl-icon> Delete
        </button>
      </div>
    `;

    confirmDialog.appendChild(confirmContent);
    document.body.appendChild(confirmDialog);

    // Add hover effects
    const cancelBtn = document.getElementById("cancel-delete");
    const confirmBtn = document.getElementById("confirm-delete");

    cancelBtn.onmouseover = () => {
      cancelBtn.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
    };
    cancelBtn.onmouseout = () => {
      cancelBtn.style.backgroundColor = "transparent";
    };

    confirmBtn.onmouseover = () => {
      confirmBtn.style.transform = "translateY(-2px)";
      confirmBtn.style.boxShadow = "0 6px 16px rgba(233, 69, 96, 0.4)";
    };
    confirmBtn.onmouseout = () => {
      confirmBtn.style.transform = "translateY(0)";
      confirmBtn.style.boxShadow = "none";
    };

    // Fade in effect
    confirmDialog.style.opacity = "0";
    setTimeout(() => {
      confirmDialog.style.opacity = "1";
      confirmDialog.style.transition = "opacity 0.2s ease";
    }, 10);

    // Close function
    const closeConfirm = () => {
      confirmDialog.style.opacity = "0";
      setTimeout(() => {
        document.body.removeChild(confirmDialog);
      }, 200);
    };

    // Event listeners
    cancelBtn.addEventListener("click", closeConfirm);

    confirmBtn.addEventListener("click", () => {
      // Get the task text for better feedback
      const taskText = todos.find((todo) => todo.id === id)?.text || "Task";
      const shortText =
        taskText.length > 30 ? taskText.substring(0, 30) + "..." : taskText;

      // Remove with animation
      const todoEl = document.querySelector(`.todo-item[data-id="${id}"]`);
      todoEl.style.animation = "fadeOut 0.4s forwards";

      setTimeout(() => {
        todos = todos.filter((todo) => todo.id !== id);
        saveTodos();
        renderTodos();
        closeConfirm();

        // Show delete success notification
        showNotification("danger", `"${shortText}" deleted`, "trash", 2000);
      }, 400);
    });

    // Close on backdrop click
    confirmDialog.addEventListener("click", (e) => {
      if (e.target === confirmDialog) {
        closeConfirm();
      }
    });
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

        showNotification(
          "warning",
          "Task cannot be empty",
          "exclamation-triangle"
        );
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

      showNotification(
        "success",
        "Task updated successfully!",
        "pencil-square",
        2000
      );

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

  // Update todo order after drag and drop
  const updateTodoOrder = () => {
    // Get all non-completed todos
    const incompleteTodos = todos.filter((todo) => !todo.completed);
    const completedTodos = todos.filter((todo) => todo.completed);

    // Get the current order from the DOM
    const todoElements = document.querySelectorAll(
      ".todo-item:not(.completed)"
    );
    const newOrderedTodos = [];

    // Create a new array with the updated order
    todoElements.forEach((el) => {
      const id = el.dataset.id;
      const todo = incompleteTodos.find((t) => t.id === id);
      if (todo) {
        newOrderedTodos.push(todo);
      }
    });

    // Combine with completed todos (which stay at the end)
    todos = [...newOrderedTodos, ...completedTodos];
    saveTodos();

    // Show notification
    showNotification("success", "Task order updated", "arrow-repeat", 2000);
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

    // Separate todos into incomplete and completed
    const incompleteTodos = todos.filter((todo) => !todo.completed);
    const completedTodos = todos.filter((todo) => todo.completed);

    // Render incomplete todos first
    incompleteTodos.forEach((todo, index) => {
      renderTodoItem(todo, index);
    });

    // If there are completed todos, add a collapsible section
    if (completedTodos.length > 0) {
      // Create completed section header
      const completedSection = document.createElement("div");
      completedSection.className = "completed-section";
      if (isCompletedSectionCollapsed) {
        completedSection.classList.add("collapsed");
      }

      const completedHeader = document.createElement("div");
      completedHeader.className = "completed-header";
      completedHeader.innerHTML = `
        <div class="completed-title">
          <sl-icon name="check2-all"></sl-icon>
          <span>Completed Tasks (${completedTodos.length})</span>
        </div>
        <div class="completed-toggle">
          <sl-icon name="${
            isCompletedSectionCollapsed ? "chevron-up" : "chevron-down"
          }"></sl-icon>
        </div>
      `;

      // Add click handler to toggle completed section
      completedHeader.addEventListener("click", () => {
        isCompletedSectionCollapsed = !isCompletedSectionCollapsed;
        completedSection.classList.toggle("collapsed");
        const chevron = completedHeader.querySelector(
          ".completed-toggle sl-icon"
        );
        if (isCompletedSectionCollapsed) {
          chevron.setAttribute("name", "chevron-up");
        } else {
          chevron.setAttribute("name", "chevron-down");
        }
      });

      // Create content container for completed todos
      const completedContent = document.createElement("div");
      completedContent.className = "completed-content";

      // Add completed todos to the content container
      // Always create DOM elements, even if the section is collapsed
      completedTodos.forEach((todo, index) => {
        const todoEl = createTodoElement(todo, incompleteTodos.length + index);
        completedContent.appendChild(todoEl);
      });

      completedSection.appendChild(completedHeader);
      completedSection.appendChild(completedContent);
      todoList.appendChild(completedSection);
    }
  };

  // Helper function to render a single todo item
  const renderTodoItem = (todo, index) => {
    const todoEl = createTodoElement(todo, index);
    todoList.appendChild(todoEl);
  };

  // Create todo element - extracted from renderTodos for reusability
  const createTodoElement = (todo, index) => {
    const todoItem = document.createElement("div");
    todoItem.className = `todo-item ${todo.completed ? "completed" : ""}`;
    todoItem.dataset.id = todo.id;

    // Add staggered animation delay for smoother list appearance
    todoItem.style.animation = `fadeIn 0.4s ${index * 0.05}s backwards`;

    // Make non-completed items draggable
    if (!todo.completed) {
      todoItem.draggable = true;
      todoItem.classList.add("draggable");

      // Add drag handle
      const dragHandle = document.createElement("div");
      dragHandle.className = "drag-handle";
      dragHandle.innerHTML = `<sl-icon name="grip-vertical"></sl-icon>`;
      todoItem.appendChild(dragHandle);

      // Drag and drop event listeners
      todoItem.addEventListener("dragstart", (e) => {
        draggedItem = todoItem;
        draggedItemId = todo.id;
        setTimeout(() => {
          todoItem.classList.add("dragging");
        }, 0);
      });

      todoItem.addEventListener("dragend", () => {
        todoItem.classList.remove("dragging");
        draggedItem = null;
        draggedItemId = null;
        // Update the order in our data
        updateTodoOrder();
      });
    }

    // Main content - checkbox, text and time
    const todoContent = document.createElement("div");
    todoContent.className = "todo-content";

    // Create checkbox for completion
    const checkbox = document.createElement("div");
    checkbox.className = `todo-checkbox ${todo.completed ? "checked" : ""}`;
    checkbox.innerHTML = `<sl-icon name="check"></sl-icon>`;
    checkbox.addEventListener("click", () => toggleTodoComplete(todo.id));

    const todoTextContainer = document.createElement("div");
    todoTextContainer.className = "todo-text-container";

    const todoText = document.createElement("div");
    todoText.className = "todo-text";
    todoText.textContent = todo.text;

    // Format the date
    const created = new Date(todo.createdAt);
    const relativeTime = formatRelativeTime(todo.createdAt);
    const fullDate = created.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const todoTime = document.createElement("div");
    todoTime.className = "todo-time";
    todoTime.innerHTML = `
      <sl-icon name="clock"></sl-icon>
      <span title="${fullDate}">${relativeTime}</span>
    `;

    todoTextContainer.appendChild(todoText);
    todoTextContainer.appendChild(todoTime);

    todoContent.appendChild(checkbox);
    todoContent.appendChild(todoTextContainer);

    // Action buttons - revert to original style but improved
    const todoActions = document.createElement("div");
    todoActions.className = "todo-actions";

    const editButton = document.createElement("sl-button");
    editButton.setAttribute("size", "small");
    editButton.setAttribute("variant", "default");
    editButton.innerHTML = '<sl-icon name="pencil"></sl-icon>';
    editButton.title = "Edit Task";

    // Only add event listener if task is not completed
    if (!todo.completed) {
      editButton.addEventListener("click", () => editTodo(todo.id));
      todoActions.appendChild(editButton);
    } else {
      editButton.setAttribute("disabled", "");
      editButton.title = "Cannot edit completed task";
      editButton.classList.add("disabled-button");
      // Wrap in a div with cursor not-allowed
      const editWrapper = document.createElement("div");
      editWrapper.style.cursor = "not-allowed";
      editWrapper.style.display = "inline-block";
      editWrapper.appendChild(editButton);
      todoActions.appendChild(editWrapper);
    }

    const deleteButton = document.createElement("sl-button");
    deleteButton.setAttribute("size", "small");
    deleteButton.setAttribute("variant", "danger");
    deleteButton.innerHTML = '<sl-icon name="trash"></sl-icon>';
    deleteButton.title = "Delete Task";

    // Only add event listener if task is not completed
    if (!todo.completed) {
      deleteButton.addEventListener("click", () => deleteTodo(todo.id));
      todoActions.appendChild(deleteButton);
    } else {
      deleteButton.setAttribute("disabled", "");
      deleteButton.title = "Cannot delete completed task";
      deleteButton.classList.add("disabled-button");
      // Wrap in a div with cursor not-allowed
      const deleteWrapper = document.createElement("div");
      deleteWrapper.style.cursor = "not-allowed";
      deleteWrapper.style.display = "inline-block";
      deleteWrapper.appendChild(deleteButton);
      todoActions.appendChild(deleteWrapper);
    }

    todoItem.appendChild(todoContent);
    todoItem.appendChild(todoActions);

    return todoItem;
  };

  // Set up drag and drop event listeners once
  todoList.addEventListener("dragover", (e) => {
    e.preventDefault();

    // Only process for non-completed items
    if (!draggedItem || draggedItem.classList.contains("completed")) return;

    const afterElement = getDragAfterElement(todoList, e.clientY);
    const draggable = document.querySelector(".dragging");

    if (afterElement && !afterElement.classList.contains("completed")) {
      todoList.insertBefore(draggable, afterElement);
    } else {
      // Find the first completed item (if any) to insert before
      const firstCompletedItem = todoList.querySelector(".todo-item.completed");
      if (firstCompletedItem) {
        todoList.insertBefore(draggable, firstCompletedItem);
      } else {
        todoList.appendChild(draggable);
      }
    }
  });

  // Helper function to determine where to drop the dragged element
  function getDragAfterElement(container, y) {
    // Get all draggable elements that are not currently being dragged and not completed
    const draggableElements = [
      ...container.querySelectorAll(
        ".draggable:not(.dragging):not(.completed)"
      ),
    ];

    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        // If offset is negative, we're above this element
        // We want the closest element that's above where we're dragging
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      { offset: Number.NEGATIVE_INFINITY }
    ).element;
  }

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
