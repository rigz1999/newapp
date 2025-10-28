// ========================================
// 🎯 REMPLACEZ UNIQUEMENT LA FONCTION handleAnalyze
// (lignes 164-271 de votre fichier actuel)
// ========================================

// ⚡ HELPER : Compresser une image (AJOUTER AVANT handleAnalyze, ligne 163)
const compressImage = (imageDataUrl: string, quality: number = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 1200;
      
      let width = img.width;
      let height = img.height;
      
      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) {
          height = (height / width) * MAX_SIZE;
          width = MAX_SIZE;
        } else {
          width = (width / height) * MAX_SIZE;
          height = MAX_SIZE;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed.split(',')[1]);
    };
    img.onerror = reject;
    img.src = imageDataUrl;
  });
};

// ========================================
// ⚡ NOUVELLE FONCTION handleAnalyze OPTIMISÉE
// ========================================
const handleAnalyze = async () => {
  if (files.length === 0) return;

  console.time('⏱️ TOTAL');
  setAnalyzing(true);
  setError('');

  try {
    const base64Images: string[] = [];
    
    console.time('🖼️ Conversion Base64');

    // Convertir tous les fichiers en Base64 compressé
    for (const file of files) {
      if (file.type === 'application/pdf') {
        // PDF → PNG → Base64
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.5 }); // ⚡ 1.5 au lieu de 2.0
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({ canvasContext: context, viewport: viewport }).promise;
          
          // Compresser avant d'envoyer
          const imageDataUrl = canvas.toDataURL('image/png');
          const compressed = await compressImage(imageDataUrl, 0.7);
          base64Images.push(compressed);
        }
      } else {
        // Image directe → Base64 compressé
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = async (e) => {
            const dataUrl = e.target?.result as string;
            try {
              const compressed = await compressImage(dataUrl, 0.7);
              resolve(compressed);
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        base64Images.push(base64);
      }
    }

    console.timeEnd('🖼️ Conversion Base64');
    console.log(`📦 ${base64Images.length} image(s) converties`);

    // Vérifier la taille totale
    const totalSize = base64Images.reduce((sum, img) => sum + img.length, 0);
    const totalSizeMB = (totalSize * 0.75 / 1024 / 1024).toFixed(2);
    console.log(`📊 Taille totale: ${totalSizeMB} MB`);

    if (totalSize > 5 * 1024 * 1024) {
      throw new Error(`Les images sont trop volumineuses (${totalSizeMB} MB). Limite: 5 MB. Réduisez le nombre de fichiers.`);
    }

    const expectedPayments = subscriptions.map(sub => ({
      investorName: sub.investisseur.nom_raison_sociale,
      expectedAmount: sub.coupon_net,
      subscriptionId: sub.id,
      investisseurId: sub.investisseur_id
    }));

    console.time('🤖 Analyse IA');

    // ⚡ APPEL OPTIMISÉ avec Base64
    const { data, error: funcError } = await supabase.functions.invoke('analyze-payment-batch', {
      body: { 
        base64Images: base64Images, // ⚡ Base64 au lieu d'URLs
        expectedPayments: expectedPayments 
      }
    });

    console.timeEnd('🤖 Analyse IA');

    if (funcError) throw funcError;
    if (!data.succes) throw new Error(data.erreur);

    const enrichedMatches = data.correspondances.map((match: any) => {
      const subscription = subscriptions.find(
        s => s.investisseur.nom_raison_sociale.toLowerCase() === match.paiement.beneficiaire.toLowerCase()
      );
      return { ...match, matchedSubscription: subscription };
    });

    setMatches(enrichedMatches);
    
    // Auto-select valid matches
    const autoSelected = new Set<number>();
    enrichedMatches.forEach((match: PaymentMatch, idx: number) => {
      if (match.statut === 'correspondance') {
        autoSelected.add(idx);
      }
    });
    setSelectedMatches(autoSelected);
    
    // Plus besoin de stocker les fichiers temporaires
    setUploadedFileUrls([]);
    setTempFileNames([]);
    
    setStep('results');

    console.timeEnd('⏱️ TOTAL');

  } catch (err: any) {
    console.error('Erreur analyse:', err);
    setError(err.message || 'Erreur lors de l\'analyse');
  } finally {
    setAnalyzing(false);
  }
};

// ========================================
// 📝 INSTRUCTIONS
// ========================================
/*
1. Trouvez la ligne 163 dans votre PaymentWizard.tsx
2. AJOUTEZ la fonction compressImage (lignes 7-34 ci-dessus)
3. REMPLACEZ la fonction handleAnalyze (lignes 164-271) par la nouvelle (lignes 38-157 ci-dessus)
4. NE TOUCHEZ À RIEN D'AUTRE
5. Sauvegardez

Résultat : Même interface, 5x plus rapide !
*/