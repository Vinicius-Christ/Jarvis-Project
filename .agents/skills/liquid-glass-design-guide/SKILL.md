---
name: liquid-glass-design-guide
description: Guia completo para aplicação de Glassmorphism e Liquid Glass no projeto JARVIS, contendo diretrizes de estilo, CSS sugerido e acessibilidade.
---

# 🌫️ GUIA ESPECIALIZADO - LIQUID Glass / GLASSMORPHISM

Este guia deve ser utilizado como referência fundamental ao criar componentes visuais, modals, painéis ou interfaces no projeto JARVIS, para garantir aderência ao estilo visual premium e futurista (Liquid Glass).

---

## 📚 O QUE É LIQUID GLASS (GLASSMORPHISM)?

Liquid Glass é um estilo de design moderno que cria a aparência de vidro translúcido com efeitos de desfoque. Ele combina:

- **Transparência**: Fundo translúcido (RGBA com opacidade baixa)
- **Backdrop Filter**: Blur aplicado ao fundo
- **Bordas Suaves**: Borders com opacidade baixa
- **Sombras Sutis**: Drop shadows realistas
- **Gradientes Leves**: Degradês para profundidade

---

## 🎨 FUNDAMENTOS TÉCNICOS

### 1. **CSS Backdrop Filter**

```css
/* Sintaxe base */
.glass {
  backdrop-filter: blur(20px) saturate(180%);
}

/* Múltiplos efeitos */
.glass-advanced {
  backdrop-filter: 
    blur(25px) 
    saturate(150%) 
    brightness(120%);
}

/* Com fallback */
.glass-safe {
  background: rgba(255, 255, 255, 0.1);
  
  @supports (backdrop-filter: blur(1px)) {
    backdrop-filter: blur(20px);
  }
  
  @supports not (backdrop-filter: blur(1px)) {
    background: rgba(255, 255, 255, 0.3);
  }
}
```

### 2. **Compatibilidade de Navegadores**

```text
✅ Chrome/Edge 76+
✅ Firefox 103+
✅ Safari 9+
✅ iOS Safari 9+
✅ Android Chrome 76+
❌ IE 11 (não suporta)
```
Dica: Use fallback para navegadores antigos.

### 3. **Considerações de Performance**

```css
/* ✅ BOM - Usa GPU */
.glass {
  backdrop-filter: blur(20px);
  transform: translateZ(0);
  will-change: transform;
}

/* ❌ RUIM - Causa reflow */
.glass-bad {
  backdrop-filter: blur(20px);
  width: calc(100% - 10px); /* Evita! */
}

/* Tip: Mobile é mais pesado */
@media (max-width: 768px) {
  .glass {
    backdrop-filter: blur(10px); /* Menos blur em mobile */
  }
}
```

---

## 🎯 PALETA DE CORES OTIMIZADA PARA GLASS

### Dark Mode (Recomendado)

```text
BACKGROUNDS:
- Very Dark: #0a0a14 (Quase preto)
- Dark: #0f0f1e (Navy profundo)
- Darker: #1a1a2e (Navy escuro)

GLASS OVERLAYS:
- Light Glass: rgba(255, 255, 255, 0.05)
- Medium Glass: rgba(255, 255, 255, 0.10)
- Strong Glass: rgba(255, 255, 255, 0.15)
- Extra Strong: rgba(255, 255, 255, 0.25)

TEXT:
- Primary: #ffffff (Branco puro)
- Secondary: #b4b4c8 (Cinza claro)
- Tertiary: #707080 (Cinza médio)
```

**Por que Dark Mode?**
- Melhor contraste com glass translúcido
- Reduz fadiga ocular
- Combina perfeitamente com efeitos de luz

---

## 🏗️ ESTRUTURA GLASS RECOMENDADA

### Camadas de Profundidade

1. **NÍVEL 1 (Fundo)**
   - Background sólido ou imagem
   - Gradiente/Padrão sutil

2. **NÍVEL 2 (Base Glass)**
   - Background: rgba(255, 255, 255, 0.08)
   - Border: 1px rgba(255, 255, 255, 0.2)
   - Blur: 20px

3. **NÍVEL 3 (Conteúdo)**
   - Cores normais
   - Tipografia legível

4. **NÍVEL 4 (Overlay/Efeitos)**
   - Glass forte: rgba(255, 255, 255, 0.25)
   - Gradiente suave e animações

---

## ✨ TÉCNICAS AVANÇADAS

### 1. **Multi-Layer Glass Effect**
```css
.glass-multilayer {
  background: 
    linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(124, 58, 237, 0.05)),
    rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(25px) saturate(200%);
  border-image: linear-gradient(135deg, rgba(0, 212, 255, 0.3), rgba(124, 58, 237, 0.3)) 1;
}
```

### 2. **Hover Elevation Effect**
```css
.glass-hover {
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
.glass-hover:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37), 0 0 20px rgba(0, 212, 255, 0.2);
  transform: translateY(-4px);
}
```

---

## 🔧 TROUBLESHOOTING

- **Blur não funciona?** Adicione background sólido de fallback.
- **Texto ilegível?** Use cores brancas com `text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);` e peso maior (font-weight: 500).
- **Mobile travando?** Reduza o `backdrop-filter: blur` para valores entre 5px e 10px usando media queries.
