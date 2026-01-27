
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { brandingService } from '../services/brandingService';
import { useToast } from '../contexts/ToastContext';
import { Upload, Save, Image as ImageIcon, Loader2 } from 'lucide-react';

export const BrandingPage: React.FC = () => {
  const [appName, setAppName] = useState('');
  const [appLogoUrl, setAppLogoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const settings = await brandingService.getBrandingSettings();
      setAppName(settings.appName || '');
      setAppLogoUrl(settings.appLogoUrl || '');
    } catch (error) {
      addToast('Erro ao carregar configurações de marca.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const publicUrl = await brandingService.uploadLogo(file);
      setAppLogoUrl(publicUrl);
      addToast('Logo carregado com sucesso!', 'success');
    } catch (error: any) {
      addToast(error.message, 'error');
    } finally {
      setIsUploading(false);
      // Limpar input para permitir re-upload do mesmo arquivo se necessário
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await brandingService.updateBrandingSettings({
        appName,
        appLogoUrl
      });
      addToast('Configurações da marca atualizadas!', 'success');
      // Opcional: Recarregar a página para aplicar mudanças globais se necessário
      // window.location.reload(); 
    } catch (error: any) {
      addToast(error.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <ImageIcon className="mr-3 text-purple-600" /> Gestão da Marca
      </h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 sm:p-8 space-y-8">
          <form onSubmit={handleSave}>
            {/* Seção do Logo */}
            <div className="mb-8">
              <label className="block text-sm font-bold text-gray-900 mb-4">Logo do Aplicativo</label>
              
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative w-32 h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                  {isUploading ? (
                    <Loader2 className="animate-spin text-gray-400" size={32} />
                  ) : appLogoUrl ? (
                    <img src={appLogoUrl} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                  ) : (
                    <ImageIcon className="text-gray-300" size={40} />
                  )}
                </div>
                
                <div className="flex-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button 
                    type="button" 
                    onClick={triggerFileInput} 
                    variant="outline"
                    disabled={isUploading}
                  >
                    <Upload size={18} className="mr-2" />
                    {appLogoUrl ? 'Alterar Logo' : 'Carregar Logo'}
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    Formatos suportados: PNG, JPG, SVG. Tamanho máximo: 2MB.<br/>
                    Recomendado: Imagem quadrada ou 4:3 com fundo transparente.
                  </p>
                </div>
              </div>
            </div>

            {/* Seção do Nome */}
            <div className="mb-8 max-w-md">
              <Input
                label="Nome do Aplicativo"
                placeholder="Ex: SeniorFit"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                maxLength={30}
              />
              <p className="text-xs text-gray-500 mt-1">
                Este nome será exibido no cabeçalho e nos títulos das páginas.
              </p>
            </div>

            <div className="pt-6 border-t border-gray-100 flex justify-end">
              <Button type="submit" variant="blue" isLoading={isSaving} disabled={isUploading}>
                <Save size={18} className="mr-2" /> Salvar Alterações
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
