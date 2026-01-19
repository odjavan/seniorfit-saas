export const generateId = (): string => {
  // 1. Tenta usar crypto.randomUUID (Navegadores Modernos + HTTPS/Localhost Seguro)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Falha silenciosa, tenta o próximo método
    }
  }

  // 2. Tenta usar crypto.getRandomValues (Compatibilidade legada segura)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    try {
      // @ts-ignore
      return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
      );
    } catch (e) {
       // Falha silenciosa
    }
  }
  
  // 3. Fallback Matemático Robusto (Ambientes HTTP ou Navegadores Antigos)
  // Gera um ID baseado em Timestamp + Math.random para garantir unicidade no cliente
  const timestamp = Date.now().toString(36);
  const randomPart1 = Math.random().toString(36).substring(2, 10);
  const randomPart2 = Math.random().toString(36).substring(2, 6);
  
  return `${timestamp}-${randomPart1}-${randomPart2}`;
};
