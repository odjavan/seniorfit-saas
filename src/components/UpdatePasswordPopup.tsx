import React, { useState } from 'react';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';

interface UpdatePasswordPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpdatePasswordPopup: React.FC<UpdatePasswordPopupProps> = ({ isOpen, onClose }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useToast();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      addToast('As senhas não conferem.', 'warning');
      return;
    }

    if (password.length < 6) {
       addToast('A senha deve ter no mínimo 6 caracteres.', 'warning');
       return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    setIsLoading(false);

    if (error) {
      addToast(`Erro ao atualizar senha: ${error.message}`, 'error');
    } else {
      addToast('Senha atualizada com sucesso! Bem-vindo ao Especial Senior.', 'success');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title="Especial Senior - Crie sua nova senha">
      <form onSubmit={handleUpdate} className="space-y-4">
         <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-100">
           Detectamos um pedido de recuperação. Por favor, defina sua nova credencial de acesso abaixo.
         </p>
         
         <Input 
           label="Nova Senha" 
           type="password" 
           value={password} 
           onChange={e => setPassword(e.target.value)} 
           required
           placeholder="Mínimo 6 caracteres"
         />
         
         <Input 
           label="Confirmar Nova Senha" 
           type="password" 
           value={confirmPassword} 
           onChange={e => setConfirmPassword(e.target.value)} 
           required
           placeholder="Repita a nova senha"
         />
         
         <div className="flex justify-end pt-2">
           <Button type="submit" variant="blue" isLoading={isLoading} fullWidth>
             Salvar Nova Senha
           </Button>
         </div>
      </form>
    </Modal>
  );
};