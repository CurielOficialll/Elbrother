window.CalculatorPage = {
  currentValue: '0',
  previousValue: null,
  operation: null,

  render() {
    // Unbind previous events if they exist to avoid duplicates
    this.unbindEvents();
    setTimeout(() => this.bindEvents(), 0);
    return `
      <div class="page-header" style="margin-bottom: 24px; padding: 0 16px;">
        <h1 class="page-title">Calculadora</h1>
      </div>
      <div class="card" style="max-width: 340px; margin: 0 auto; padding: 24px; background: var(--surface); border: 1px solid var(--outline-variant); border-radius: var(--radius-lg); box-shadow: var(--shadow);">
        <div id="calc-display" style="background: var(--surface-lowest); color: var(--primary); font-family: var(--font-mono); font-size: 2.5rem; padding: 16px; text-align: right; border-radius: var(--radius); margin-bottom: 24px; border: 1px solid var(--outline-variant); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">0</div>
        
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
          <button class="calc-btn action-clear" data-action="clear" style="grid-column: span 3; background: var(--error-container); color: var(--on-error); border-radius: var(--radius); padding: 16px; font-weight: bold; transition: all var(--transition);">C</button>
          <button class="calc-btn action-op" data-action="operator" data-val="/" style="background: var(--surface-high); color: var(--primary); border-radius: var(--radius); padding: 16px; font-weight: bold; font-size: 1.2rem; transition: all var(--transition);">/</button>
          
          <button class="calc-btn action-num" data-action="num" data-val="7" style="background: var(--surface-container); color: var(--on-surface); border-radius: var(--radius); padding: 16px; font-weight: bold; font-size: 1.2rem; transition: all var(--transition);">7</button>
          <button class="calc-btn action-num" data-action="num" data-val="8" style="background: var(--surface-container); color: var(--on-surface); border-radius: var(--radius); padding: 16px; font-weight: bold; font-size: 1.2rem; transition: all var(--transition);">8</button>
          <button class="calc-btn action-num" data-action="num" data-val="9" style="background: var(--surface-container); color: var(--on-surface); border-radius: var(--radius); padding: 16px; font-weight: bold; font-size: 1.2rem; transition: all var(--transition);">9</button>
          <button class="calc-btn action-op" data-action="operator" data-val="*" style="background: var(--surface-high); color: var(--primary); border-radius: var(--radius); padding: 16px; font-weight: bold; font-size: 1.2rem; transition: all var(--transition);">×</button>
          
          <button class="calc-btn action-num" data-action="num" data-val="4" style="background: var(--surface-container); color: var(--on-surface); border-radius: var(--radius); padding: 16px; font-weight: bold; font-size: 1.2rem; transition: all var(--transition);">4</button>
          <button class="calc-btn action-num" data-action="num" data-val="5" style="background: var(--surface-container); color: var(--on-surface); border-radius: var(--radius); padding: 16px; font-weight: bold; font-size: 1.2rem; transition: all var(--transition);">5</button>
          <button class="calc-btn action-num" data-action="num" data-val="6" style="background: var(--surface-container); color: var(--on-surface); border-radius: var(--radius); padding: 16px; font-weight: bold; font-size: 1.2rem; transition: all var(--transition);">6</button>
          <button class="calc-btn action-op" data-action="operator" data-val="-" style="background: var(--surface-high); color: var(--primary); border-radius: var(--radius); padding: 16px; font-weight: bold; font-size: 1.2rem; transition: all var(--transition);">-</button>
          
          <button class="calc-btn action-num" data-action="num" data-val="1" style="background: var(--surface-container); color: var(--on-surface); border-radius: var(--radius); padding: 16px; font-weight: bold; font-size: 1.2rem; transition: all var(--transition);">1</button>
          <button class="calc-btn action-num" data-action="num" data-val="2" style="background: var(--surface-container); color: var(--on-surface); border-radius: var(--radius); padding: 16px; font-weight: bold; font-size: 1.2rem; transition: all var(--transition);">2</button>
          <button class="calc-btn action-num" data-action="num" data-val="3" style="background: var(--surface-container); color: var(--on-surface); border-radius: var(--radius); padding: 16px; font-weight: bold; font-size: 1.2rem; transition: all var(--transition);">3</button>
          <button class="calc-btn action-op" data-action="operator" data-val="+" style="background: var(--surface-high); color: var(--primary); border-radius: var(--radius); padding: 16px; font-weight: bold; font-size: 1.2rem; transition: all var(--transition);">+</button>
          
          <button class="calc-btn action-num" data-action="num" data-val="0" style="grid-column: span 2; background: var(--surface-container); color: var(--on-surface); border-radius: var(--radius); padding: 16px; font-weight: bold; font-size: 1.2rem; transition: all var(--transition);">0</button>
          <button class="calc-btn action-num" data-action="num" data-val="." style="background: var(--surface-container); color: var(--on-surface); border-radius: var(--radius); padding: 16px; font-weight: bold; font-size: 1.2rem; transition: all var(--transition);">.</button>
          <button class="calc-btn action-eq" data-action="calculate" style="background: var(--primary); color: var(--on-primary); border-radius: var(--radius); padding: 16px; font-weight: bold; font-size: 1.2rem; transition: all var(--transition); box-shadow: 0 0 12px rgba(0, 224, 255, 0.3);">=</button>
        </div>
      </div>
      <style>
        .calc-btn:hover {
          filter: brightness(1.2);
          transform: translateY(-2px);
        }
        .calc-btn:active {
          transform: translateY(1px);
        }
      </style>
    `;
  },

  bindEvents() {
    this.currentValue = '0';
    this.previousValue = null;
    this.operation = null;
    this.updateDisplay();

    document.querySelectorAll('.calc-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        const val = e.currentTarget.dataset.val;

        if (action === 'num') this.appendNumber(val);
        if (action === 'operator') this.chooseOperation(val);
        if (action === 'clear') this.clear();
        if (action === 'calculate') this.calculate();
        
        // Use global sound effect if available
        if(window.Sounds) window.Sounds.play('click');
      });
    });
    
    // Support for keyboard
    this.handleKeyDown = this.handleKeyDown.bind(this);
    document.addEventListener('keydown', this.handleKeyDown);
  },

  unbindEvents() {
    if (this.handleKeyDown) {
      document.removeEventListener('keydown', this.handleKeyDown);
    }
  },

  handleKeyDown(e) {
    if (Store.get('currentPage') !== 'calculator') {
      this.unbindEvents();
      return;
    }
    
    if ((e.key >= '0' && e.key <= '9') || e.key === '.') {
      this.appendNumber(e.key);
      if(window.Sounds) window.Sounds.play('click');
    }
    if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/') {
      this.chooseOperation(e.key);
      if(window.Sounds) window.Sounds.play('click');
    }
    if (e.key === 'Enter' || e.key === '=') {
      e.preventDefault();
      this.calculate();
      if(window.Sounds) window.Sounds.play('click');
    }
    if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'Delete') {
      this.clear();
      if(window.Sounds) window.Sounds.play('click');
    }
  },

  appendNumber(num) {
    if (num === '.' && this.currentValue.includes('.')) return;
    if (this.currentValue === '0' && num !== '.') {
      this.currentValue = num;
    } else {
      this.currentValue += num;
    }
    this.updateDisplay();
  },

  chooseOperation(op) {
    if (this.currentValue === '') return;
    if (this.previousValue !== null) {
      this.calculate();
    }
    this.operation = op;
    this.previousValue = this.currentValue;
    this.currentValue = '';
  },

  calculate() {
    let result;
    const prev = parseFloat(this.previousValue);
    const current = parseFloat(this.currentValue);
    if (isNaN(prev) || isNaN(current)) return;

    switch (this.operation) {
      case '+': result = prev + current; break;
      case '-': result = prev - current; break;
      case '*': result = prev * current; break;
      case '/': result = prev / current; break;
      default: return;
    }

    // Fix precision issues
    result = Math.round(result * 100000000) / 100000000;

    this.currentValue = result.toString();
    this.operation = null;
    this.previousValue = null;
    this.updateDisplay();
  },

  clear() {
    this.currentValue = '0';
    this.previousValue = null;
    this.operation = null;
    this.updateDisplay();
  },

  updateDisplay() {
    const display = document.getElementById('calc-display');
    if (display) display.textContent = this.currentValue;
  }
};
