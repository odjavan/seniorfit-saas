import emailjs from '@emailjs/browser';
import { authService } from './authService';

export const emailService = {
  sendRecovery: async (email: string): Promise<void> => {
    // 1. Validação de Parâmetro
    if (!email || typeof email !== 'string') {
        throw new Error('O endereço de e-mail é obrigatório para o envio.');
    }

    // 2. Log de Auditoria
    console.log('Preparando envio para:', email);

    // 3. Recuperar senha/hint
    // Await explícito para garantir que recebemos o array de usuários e não uma Promise
    const users = await authService.getAllUsers();
    
    // Verificação de segurança caso o serviço retorne algo inesperado
    if (!Array.isArray(users)) {
        throw new Error('Erro interno ao verificar usuários.');
    }

    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    let passwordHint = '123456'; // Senha padrão
    if (user) {
        if (user.role === 'ADMIN' && user.email === 'admin@seniorfit.com') {
            passwordHint = 'admin';
        } else if (user.cpf) {
            // Regra Eduzz: Senha é o CPF (apenas números)
            passwordHint = user.cpf.replace(/\D/g, '');
        }
    }

    // Await explícito para configurações
    const settings = await authService.getIntegrationSettings();
    const { serviceId, templateIdRecovery, publicKey } = settings.emailjs;

    console.log("Configurações EmailJS carregadas:", { 
        hasServiceId: !!serviceId, 
        hasTemplate: !!templateIdRecovery, 
        hasKey: !!publicKey 
    });

    if (!serviceId || !templateIdRecovery || !publicKey) {
      throw new Error('Configurações de E-mail (EmailJS) incompletas. Verifique o Painel Admin > Integrações.');
    }

    try {
      // 4. Inicialização Explícita
      emailjs.init(publicKey);

      // 5. Construção do Link/Código
      const resetLink = `${window.location.origin}/reset-password-mock?email=${encodeURIComponent(email)}`;

      // 6. Mapeamento Estrito de Variáveis
      const templateParams = {
        email: email,               // Destinatário
        user_password: passwordHint, // A senha recuperada (ou lógica de senha)
        passcode: resetLink         // O link ou código
      };

      console.log('Enviando payload:', templateParams);

      // 7. Envio
      const response = await emailjs.send(
        serviceId,
        templateIdRecovery,
        templateParams,
        publicKey
      );

      console.log("EmailJS Sucesso:", response);
    } catch (error: any) {
      console.error("ERRO CRÍTICO EMAILJS:", error);
      
      if (error.text && error.text.includes('recipients address is empty')) {
         throw new Error('O EmailJS rejeitou o destinatário. Verifique se o campo "To Email" no template está configurado EXATAMENTE como {{email}}.');
      }

      const errorText = error.text || error.message || JSON.stringify(error);
      throw new Error(`Falha no envio: ${errorText}`);
    }
  }
};