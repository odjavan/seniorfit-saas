import emailjs from '@emailjs/browser';
import { authService } from './authService';

export const emailService = {
  sendRecovery: async (email: string): Promise<void> => {
    // 1. Validação de Parâmetro
    if (!email || typeof email !== 'string') {
        throw new Error('O endereço de e-mail é obrigatório para o envio.');
    }

    // 2. Log de Segurança (Auditoria)
    console.log('Preparando envio para:', email);

    const settings = authService.getIntegrationSettings();
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
      // 3. Inicialização Explícita
      emailjs.init(publicKey);

      // 4. Construção do Link de Recuperação
      const recoveryLink = `${window.location.origin}/reset-password-mock?email=${encodeURIComponent(email)}`;

      // 5. Mapeamento de Variáveis
      // Certifique-se que no EmailJS o template usa {{to_email}} no campo "To Email"
      const templateParams = {
        to_email: email, 
        to_name: email.split('@')[0], 
        link: recoveryLink,
        message: 'Você solicitou a recuperação de senha do SeniorFit. Clique no link abaixo para redefinir.',
        reply_to: 'suporte@seniorfit.com'
      };

      // 6. Envio
      const response = await emailjs.send(
        serviceId,
        templateIdRecovery,
        templateParams,
        publicKey
      );

      console.log("EmailJS Sucesso:", response);
    } catch (error: any) {
      console.error("ERRO CRÍTICO EMAILJS:", error);
      
      // Tratamento específico para erro de destinatário
      if (error.text && error.text.includes('recipients address is empty')) {
         throw new Error('O EmailJS rejeitou o destinatário. Verifique se o template usa a variável {{to_email}} no campo "To Email".');
      }

      const errorText = error.text || error.message || JSON.stringify(error);
      throw new Error(`Falha no envio: ${errorText}`);
    }
  }
};