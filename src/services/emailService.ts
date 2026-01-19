import emailjs from '@emailjs/browser';
import { authService } from './authService';

export const emailService = {
  sendRecovery: async (email: string): Promise<void> => {
    const settings = authService.getIntegrationSettings();
    const { serviceId, templateIdRecovery, publicKey } = settings.emailjs;

    console.log("Iniciando serviço de e-mail...", { 
        hasServiceId: !!serviceId, 
        hasTemplate: !!templateIdRecovery, 
        hasKey: !!publicKey 
    });

    if (!serviceId || !templateIdRecovery || !publicKey) {
      throw new Error('Configurações de E-mail (EmailJS) incompletas. Verifique o Painel Admin > Integrações.');
    }

    try {
      // 1. Inicialização Explícita
      emailjs.init(publicKey);

      // 2. Construção do Link de Mock (Simulação)
      const recoveryLink = `${window.location.origin}/reset-password-mock?email=${encodeURIComponent(email)}`;

      // 3. Mapeamento de Variáveis
      const templateParams = {
        to_email: email,
        to_name: email.split('@')[0], 
        link: recoveryLink,
        message: 'Você solicitou a recuperação de senha do SeniorFit. Clique no link abaixo para redefinir.',
        reply_to: 'suporte@seniorfit.com'
      };

      // 4. Envio
      const response = await emailjs.send(
        serviceId,
        templateIdRecovery,
        templateParams,
        publicKey
      );

      console.log("EmailJS Sucesso:", response);
    } catch (error: any) {
      console.error("ERRO CRÍTICO EMAILJS:", error);
      const errorText = error.text || error.message || JSON.stringify(error);
      throw new Error(`Falha no envio: ${errorText}`);
    }
  }
};
