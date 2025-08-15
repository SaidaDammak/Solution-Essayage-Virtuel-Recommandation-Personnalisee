import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';

// Configuration OpenAI
const OPENAI_API_KEY = 'put your key here';

// Composant AI Assistant pour la recommandation de taille
function AIAssistant({ product, uploadedImage }) {
  const [isLoading, setIsLoading] = useState(false);
  const [sizeRecommendation, setSizeRecommendation] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [conversation, setConversation] = useState([
    {
      role: 'assistant',
      content: `Bonjour ! Je suis votre assistant mode. Je vois que vous regardez "${product.name}". Pour vous recommander la taille la plus appropriée, j'aurais besoin de voir votre photo. Pouvez-vous uploader une photo de vous ?`
    }
  ]);

  const getSizeRecommendation = async () => {
    if (!uploadedImage) {
      setConversation(prev => [...prev, {
        role: 'assistant',
        content: 'Veuillez d\'abord uploader votre photo pour que je puisse vous recommander la taille appropriée.'
      }]);
      return;
    }

    setIsLoading(true);
    
    try {
      // Convertir l'image en base64 pour l'API Vision
      const base64Image = uploadedImage.split(',')[1];
      
      const prompt = `En tant qu'expert en mode et stylisme, analysez cette photo de la personne et le vêtement "${product.name}" pour recommander UNIQUEMENT une taille parmi S, M, L, XL.

Instructions strictes :
- Analysez la morphologie de la personne sur la photo
- Considérez le style et la coupe du vêtement
- Répondez UNIQUEMENT avec une lettre : S, M, L, ou XL
- Pas d'explication, pas de texte supplémentaire
- Juste la lettre de la taille recommandée

Vêtement : ${product.name}
Description : ${product.description}
Prix : ${product.price}

Répondez uniquement avec la taille recommandée :`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'Vous êtes un expert en mode et stylisme. Votre rôle est d\'analyser des photos de personnes et de recommander la taille appropriée pour des vêtements. Répondez UNIQUEMENT avec la lettre de la taille (S, M, L, ou XL).'
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          max_tokens: 10,
          temperature: 0.2
        })
      });

      if (response.ok) {
        const data = await response.json();
        const recommendation = data.choices[0].message.content.trim().toUpperCase();
        
        // Vérifier que la réponse est une taille valide
        if (['S', 'M', 'L', 'XL'].includes(recommendation)) {
          setSizeRecommendation(recommendation);
          setConversation(prev => [...prev, {
            role: 'assistant',
            content: `Basé sur l'analyse de votre photo et de "${product.name}", je recommande la taille : **${recommendation}**`
          }]);
        } else {
          throw new Error('Réponse invalide de l\'API');
        }
      } else {
        throw new Error(`Erreur API: ${response.status}`);
      }
    } catch (error) {
      console.error('Erreur lors de la recommandation:', error);
      setConversation(prev => [...prev, {
        role: 'assistant',
        content: 'Désolé, je n\'ai pas pu analyser votre photo pour le moment. Veuillez réessayer.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (message) => {
    if (!message.trim()) return;

    // Ajouter le message de l'utilisateur
    const userMessage = { role: 'user', content: message };
    setConversation(prev => [...prev, userMessage]);
    setUserInput('');

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Vous êtes un assistant mode expert et sympathique. Vous aidez les clients à choisir leurs vêtements et tailles. 
              
Produit actuel : ${product.name}
Description : ${product.description}
Prix : ${product.price}

Répondez de manière naturelle et utile en français.`
            },
            ...conversation,
            userMessage
          ],
          max_tokens: 150,
          temperature: 0.7
        })
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage = data.choices[0].message.content;
        
        setConversation(prev => [...prev, {
          role: 'assistant',
          content: assistantMessage
        }]);
      } else {
        throw new Error(`Erreur API: ${response.status}`);
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      setConversation(prev => [...prev, {
        role: 'assistant',
        content: 'Désolé, je n\'ai pas pu traiter votre message pour le moment. Veuillez réessayer.'
      }]);
    }
  };

  const addUserMessage = (message) => {
    sendMessage(message);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(userInput);
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-100">
      <h3 className="text-base font-semibold text-gray-900 mb-3">Assistant AI</h3>
      
      {/* Conversation compacte */}
      <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
        {conversation.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-32 p-2 rounded-lg text-xs ${
              msg.role === 'user' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white text-gray-800 shadow-sm'
            }`}>
              <p>{msg.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bouton de recommandation compact */}
      <div className="flex flex-col space-y-2 mb-3">
        {!sizeRecommendation && (
          <button
            onClick={getSizeRecommendation}
            disabled={isLoading || !uploadedImage}
            className={`px-3 py-2 rounded-lg font-medium text-sm transition ${
              isLoading || !uploadedImage
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Analyse...</span>
              </div>
            ) : (
              'Recommandation de taille'
            )}
          </button>
        )}
 
        {/* Affichage de la recommandation compact */}
        {sizeRecommendation && (
          <div className="bg-green-100 border border-green-200 rounded-lg p-2 text-center">
            <p className="text-green-800 font-semibold text-sm">
              Taille : <span className="text-lg text-green-600">{sizeRecommendation}</span>
            </p>
          </div>
        )}
      </div>

      {/* Chat input compact */}
      <form onSubmit={handleSubmit} className="flex space-x-2 mb-2">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Question..."
          className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition"
        >
          Envoyer
        </button>
      </form>

      {/* Messages rapides compacts */}
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => addUserMessage('Différences de tailles ?')}
          className="bg-white text-blue-600 px-2 py-1 rounded text-xs hover:bg-blue-50 transition border border-blue-200"
        >
          Tailles
        </button>
        <button
          onClick={() => addUserMessage('Mesures ?')}
          className="bg-white text-blue-600 px-2 py-1 rounded text-xs hover:bg-blue-50 transition border border-blue-200"
        >
          Mesures
        </button>
        <button
          onClick={() => addUserMessage('Style ?')}
          className="bg-white text-blue-600 px-2 py-1 rounded text-xs hover:bg-blue-50 transition border border-blue-200"
        >
          Style
        </button>
      </div>
    </div>
  );
}

const products = [
  {
    id: 1,
    name: 'Classic White T-shirt',
    price: '29€',
    image: process.env.PUBLIC_URL + '/tshirt.png',
    description: 'T-shirt blanc classique en coton doux, coupe droite avec col rond. Parfait pour un style casual élégant.',
    category: 'haut',
    color: 'blanc',
    style: 'casual'
  },
  {
    id: 2,
    name: 'Black T-shirt',
    price: '25€',
    image: process.env.PUBLIC_URL + '/tshirt1.png',
    description: 'T-shirt noir basique en coton, coupe confortable et style intemporel. Parfait pour toutes les occasions.',
    category: 'haut',
    color: 'noir',
    style: 'casual'
  },
  {
    id: 3,
    name: 'Elegant Black Pants',
    price: '59€',
    image: process.env.PUBLIC_URL + '/pantalon.png',
    description: 'Pantalon noir élégant avec coupe large, ceinture plate et bouton central. Idéal pour toutes les occasions.',
    category: 'bas',
    color: 'noir',
    style: 'élégant'
  },
  {
    id: 4,
    name: 'Print Dress',
    price: '89€',
    image: process.env.PUBLIC_URL + '/robe.png',
    description: 'Robe midi fluide avec motif abstrait en noir, crème, jaune moutarde et bleu clair. Manches courtes évasées et ceinture à nouer.',
    category: 'robe',
    color: 'multicolore',
    style: 'élégant'
  },
  {
    id: 5,
    name: 'Short Blue Dress',
    price: '79€',
    image: process.env.PUBLIC_URL + '/dress.jpg',
    description: 'Robe bleue courte élégante, parfaite pour les occasions spéciales. Coupe moderne et confortable.',
    category: 'robe',
    color: 'bleu',
    style: 'élégant'
  },
  {
    id: 6,
    name: 'Beige Sneakers',
    price: '69€',
    image: process.env.PUBLIC_URL + '/baskets beige.jpg',
    description: 'Baskets élégantes, couleur beige, semelle épaisse, style épuré et moderne.',
    category: 'chaussures',
    color: 'beige',
    style: 'casual'
  },
  {
    id: 7,
    name: 'Dark Denim Jeans',
    price: '65€',
    image: process.env.PUBLIC_URL + '/djean fonce.jpg',
    description: 'Jean foncé classique en denim de qualité, coupe slim moderne avec finition élégante. Parfait pour un style casual chic.',
    category: 'bas',
    color: 'bleu',
    style: 'casual'
  },
  {
    id: 8,
    name: 'Elegant Beige Bag',
    price: '45€',
    image: process.env.PUBLIC_URL + '/bag.jpg',
    description: 'Sac bag élégant et pratique, parfait pour accompagner tous vos looks. Style minimaliste et fonctionnel.',
    category: 'accessoire',
    color: 'beige',
    style: 'élégant'
  },
  {
    id: 9,
    name: 'Modern Beige Skirt',
    price: '55€',
    image: process.env.PUBLIC_URL + '/skirt.jpg',
    description: 'Jupe moderne avec une coupe contemporaine, parfaite pour un style élégant et sophistiqué.',
    category: 'bas',
    color: 'beige',
    style: 'élégant'
  },
  {
    id: 10,
    name: 'Red Top',
    price: '35€',
    image: process.env.PUBLIC_URL + '/top.jpg',
    description: 'Top élégant avec un design raffiné, idéal pour créer des looks sophistiqués et modernes.',
    category: 'haut',
    color: 'rouge',
    style: 'élégant'
  },
  {
    id: 11,
    name: 'White Sneakers',
    price: '75€',
    image: process.env.PUBLIC_URL + '/white sneakers.jpg',
    description: 'Sneakers blanches classiques et intemporelles, parfaites pour un style casual chic et moderne.',
    category: 'chaussures',
    color: 'blanc',
    style: 'casual'
  },
  {
    id: 12,
    name: 'Elegant White Bag',
    price: '55€',
    image: process.env.PUBLIC_URL + '/white bag.jpg',
    description: 'Sac blanc élégant et raffiné, parfait pour accompagner vos looks sophistiqués. Style minimaliste et moderne.',
    category: 'accessoire',
    color: 'blanc',
    style: 'élégant'
  },
];

// Système de recommandation intelligent
const getRecommendations = (selectedProduct) => {
  const recommendations = [];
  
  // Règles de recommandation basées sur le produit sélectionné
  if (selectedProduct.category === 'haut') {
    // Pour les hauts, recommander des bas et chaussures
    const bottoms = products.filter(p => p.category === 'bas' && p.id !== selectedProduct.id);
    const shoes = products.filter(p => p.category === 'chaussures' && p.id !== selectedProduct.id);
    
    // Recommandations spécifiques pour le T-shirt blanc
    if (selectedProduct.color === 'blanc') {
      // T-shirt blanc + Tous les jeans disponibles + Baskets beiges = combo parfait
      const jeans = products.filter(p => p.category === 'bas' && p.name.toLowerCase().includes('jean'));
      const basketsBeiges = products.find(p => p.name === 'Beige Sneakers');
      
      // Ajouter tous les jeans disponibles
      jeans.forEach(jean => {
        recommendations.push({ ...jean, reason: 'Complète parfaitement votre T-shirt blanc' });
      });
      if (basketsBeiges) recommendations.push({ ...basketsBeiges, reason: 'Apporte une touche élégante à votre look' });
    }
    
    // Recommandations pour le T-shirt noir
    if (selectedProduct.color === 'noir') {
      // T-shirt noir + Tous les jeans + Baskets beiges
      const jeans = products.filter(p => p.category === 'bas' && p.name.toLowerCase().includes('jean'));
      const basketsBeiges = products.find(p => p.name === 'Beige Sneakers');
      
      // Ajouter tous les jeans disponibles
      jeans.forEach(jean => {
        recommendations.push({ ...jean, reason: 'Look monochrome élégant' });
      });
      if (basketsBeiges) recommendations.push({ ...basketsBeiges, reason: 'Contraste parfait avec le noir' });
    }
  }
  
  // Pour les robes, recommander des chaussures
  if (selectedProduct.category === 'robe') {
    const shoes = products.filter(p => p.category === 'chaussures' && p.id !== selectedProduct.id);
    recommendations.push(...shoes.map(s => ({ ...s, reason: 'Complète votre robe avec élégance' })));
  }
  
  // Pour les bas, recommander des hauts et chaussures
  if (selectedProduct.category === 'bas') {
    // Règles intelligentes pour les bas
    let recommendedTops = [];
    
    // Pour les jupes noires élégantes
    if (selectedProduct.name.toLowerCase().includes('skirt') && selectedProduct.color === 'beige' && selectedProduct.style === 'élégant') {
      // Jupe noire élégante → Tops élégants et chaussures élégantes
      recommendedTops = products.filter(p => 
        p.category === 'haut' && 
        p.id !== selectedProduct.id && 
        p.style === 'élégant' &&
        (p.color === 'blanc' || p.color === 'rouge' || p.color === 'bleu')
      );
    }
    
    // Pour les jeans
    else if (selectedProduct.name.toLowerCase().includes('jean')) {
      // Jeans → Tops casual et chaussures casual
      recommendedTops = products.filter(p => 
        p.category === 'haut' && 
        p.id !== selectedProduct.id && 
        p.style === 'casual'
      );
    }
    
    // Pour les pantalons élégants
    else if (selectedProduct.style === 'élégant') {
      // Pantalon élégant → Tops élégants
      recommendedTops = products.filter(p => 
        p.category === 'haut' && 
        p.id !== selectedProduct.id && 
        p.style === 'élégant'
      );
    }
    
    // Règles de couleur intelligentes
    if (selectedProduct.color === 'beige') {
      // Bas beiges → Éviter les tops beiges (look trop monotone)
      recommendedTops = recommendedTops.filter(p => p.color !== 'beige');
    }
    
    if (selectedProduct.color === 'rouge') {
      // Tops rouges → Éviter les bas rouges (look trop intense)
      recommendedTops = recommendedTops.filter(p => p.color !== 'rouge');
    }
    
    // Ajouter les tops recommandés avec des raisons personnalisées
    recommendedTops.forEach(top => {
      let reason = 'Crée un look équilibré';
      if (selectedProduct.style === 'élégant' && top.style === 'élégant') {
        reason = 'Look élégant et sophistiqué';
      } else if (selectedProduct.style === 'casual' && top.style === 'casual') {
        reason = 'Style casual décontracté';
      }
      recommendations.push({ ...top, reason });
    });
    
    // Chaussures adaptées au style
    const shoes = products.filter(p => p.category === 'chaussures' && p.id !== selectedProduct.id);
    shoes.forEach(shoe => {
      let reason = 'Finalise votre tenue';
      if (selectedProduct.style === 'élégant' && shoe.style === 'élégant') {
        reason = 'Complète votre look élégant';
      } else if (selectedProduct.style === 'casual' && shoe.style === 'casual') {
        reason = 'Style casual parfait';
      }
      recommendations.push({ ...shoe, reason });
    });
  }
  
  // Pour les chaussures, recommander des vêtements
  if (selectedProduct.category === 'chaussures') {
    const tops = products.filter(p => p.category === 'haut' && p.id !== selectedProduct.id);
    const bottoms = products.filter(p => p.category === 'bas' && p.id !== selectedProduct.id);
    
    recommendations.push(...tops.map(t => ({ ...t, reason: 'Démarre votre tenue' })));
    recommendations.push(...bottoms.map(b => ({ ...b, reason: 'Complète votre look' })));
  }
  
  // Pour les accessoires, créer des combinaisons intelligentes
  if (selectedProduct.category === 'accessoire') {
    // White Bag → Recommande des jupes élégantes
    if (selectedProduct.name.toLowerCase().includes('white bag')) {
      const skirts = products.filter(p => 
        p.category === 'bas' && 
        p.name.toLowerCase().includes('jupe') && 
        p.style === 'élégant'
      );
      skirts.forEach(skirt => {
        recommendations.push({ ...skirt, reason: 'Combo parfait : White bag + Jupe élégante' });
      });
      
      // Ajouter aussi des tops élégants pour compléter
      const elegantTops = products.filter(p => 
        p.category === 'haut' && 
        p.style === 'élégant' && 
        p.color !== 'noir' // Éviter le look trop sombre
      );
      elegantTops.forEach(top => {
        recommendations.push({ ...top, reason: 'Top élégant pour votre white bag' });
      });
    }
    
    // Bag.jpg (noir) → Recommande des jeans
    else if (selectedProduct.name.toLowerCase().includes('bag') && selectedProduct.color === 'noir') {
      const jeans = products.filter(p => 
        p.category === 'bas' && 
        p.name.toLowerCase().includes('jean')
      );
      jeans.forEach(jean => {
        recommendations.push({ ...jean, reason: 'Combo parfait : Bag noir + Jean' });
      });
      
      // Ajouter des tops casual pour le style jean
      const casualTops = products.filter(p => 
        p.category === 'haut' && 
        p.style === 'casual'
      );
      casualTops.forEach(top => {
        recommendations.push({ ...top, reason: 'Top casual pour votre look jean' });
      });
    }
  }
  
  // Retourner les 3 meilleures recommandations
  return recommendations.slice(0, 3);
};

function CanvasEditor({ uploadedImage, onMaskComplete, isProcessing, setIsProcessing, product }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [maskData, setMaskData] = useState(null);


  useEffect(() => {
    if (!uploadedImage) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Initialize mask canvas
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = img.width;
      maskCanvas.height = img.height;
      const maskCtx = maskCanvas.getContext('2d');
      maskCtx.fillStyle = 'rgba(0, 0, 0, 0)';
      maskCtx.fillRect(0, 0, img.width, img.height);
      setMaskData(maskCanvas);
    };
    img.src = uploadedImage;
  }, [uploadedImage]);

  const startDrawing = (e) => {
    setIsDrawing(true);
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    // Calculer les coordonnées avec le facteur d'échelle
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // Commencer un nouveau chemin
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    // Update mask
    if (maskData) {
      const maskCtx = maskData.getContext('2d');
      maskCtx.beginPath();
      maskCtx.moveTo(x, y);
    }
    
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
  };



  const updateCanvasDisplay = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Redessiner l'image de base
    if (uploadedImage) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        
        // Superposer le mask avec transparence
        if (maskData) {
          ctx.globalAlpha = 0.5;
          ctx.drawImage(maskData, 0, 0);
          ctx.globalAlpha = 1.0;
        }
      };
      img.src = uploadedImage;
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    // Calculer les coordonnées avec le facteur d'échelle
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    // Update mask
    if (maskData) {
      const maskCtx = maskData.getContext('2d');
      maskCtx.lineWidth = brushSize;
      maskCtx.lineCap = 'round';
      maskCtx.strokeStyle = 'rgba(255, 255, 255, 1)';
      maskCtx.lineTo(x, y);
      maskCtx.stroke();
      maskCtx.beginPath();
      maskCtx.moveTo(x, y);
    }
  };

  const clearMask = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (uploadedImage) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = uploadedImage;
    }
    
    if (maskData) {
      const maskCtx = maskData.getContext('2d');
      maskCtx.clearRect(0, 0, maskData.width, maskData.height);
      maskCtx.fillStyle = 'rgba(0, 0, 0, 0)';
      maskCtx.fillRect(0, 0, maskData.width, maskData.height);
    }
  };

  const applyInpainting = async () => {
    if (!maskData || !uploadedImage) return;
    
    setIsProcessing(true);
    
    try {
      console.log('🚀 Début de l\'appel API inpainting...');
      
      const formData = new FormData();
      
      // Convert uploaded image to blob
      console.log('📸 Conversion de l\'image uploadée...');
      const baseImageBlob = await fetch(uploadedImage).then(r => r.blob());
      formData.append('base_image', baseImageBlob, 'base_image.jpg');
      console.log('✅ Image de base ajoutée au FormData');
      
      // Convert mask to blob
      console.log('🎨 Conversion du mask...');
      const maskBlob = await new Promise((resolve) => {
        maskData.toBlob((blob) => {
          resolve(blob);
        }, 'image/png');
      });
      formData.append('mask', maskBlob, 'mask.png');
      console.log('✅ Mask ajouté au FormData');
      
      // Convert ref image to blob
      console.log('🖼️ Conversion de l\'image de référence...');
      console.log('Produit sélectionné:', product);
      
      const refImageBlob = await fetch(product.image).then(r => r.blob());
      formData.append('ref_image', refImageBlob, 'ref_image.png');
      console.log('✅ Image de référence ajoutée au FormData');
      
      // Add prompt parameter
      formData.append('prompt', '');
      console.log('✅ Prompt ajouté au FormData');
      
      console.log('🌐 Envoi de la requête à l\'API...');
      console.log('URL API:', 'http://d29d82b3-2ed9-4b58-ab69-1e39fa5d0b46.pub.instances.scw.cloud:8007/inpaint');
      
      const response = await fetch('http://d29d82b3-2ed9-4b58-ab69-1e39fa5d0b46.pub.instances.scw.cloud:8007/inpaint', {
        method: 'POST',
        body: formData,
      });
      
      console.log('📡 Réponse reçue:', response.status, response.statusText);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Succès! Résultat:', result);
        console.log('📊 Structure de la réponse:', {
          hasResultUrl: !!result.result_url,
          hasImage: !!result.image,
          resultUrlType: typeof result.result_url,
          imageType: typeof result.image,
          keys: Object.keys(result)
        });
        onMaskComplete(result);
      } else {
        const errorText = await response.text();
        console.error('❌ Erreur API:', response.status, response.statusText);
        console.error('Détails de l\'erreur:', errorText);
        alert(`Erreur API: ${response.status} - ${response.statusText}\nDétails: ${errorText}`);
      }
    } catch (error) {
      console.error('💥 Erreur lors de l\'appel API:', error);
      alert(`Erreur de connexion: ${error.message}\n\nVérifiez que l'API est accessible et que CORS est configuré.`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex items-center space-x-4 mb-4">
        <label className="text-sm font-medium">Taille du brush:</label>
        <input
          type="range"
          min="5"
          max="100"
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="w-32"
        />
        <span className="text-sm">{brushSize}px</span>
        <button
          onClick={clearMask}
          className="bg-red-500 text-white px-3 py-1 rounded text-sm"
        >
          Effacer
        </button>

      </div>
      
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onMouseMove={draw}
          className="cursor-crosshair"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </div>
      
      <button
        onClick={applyInpainting}
        disabled={isProcessing}
        className={`px-6 py-3 rounded-full font-medium transition ${
          isProcessing 
            ? 'bg-gray-400 text-white cursor-not-allowed' 
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
      >
        {isProcessing ? (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Traitement en cours...</span>
          </div>
        ) : (
          'Try on'
        )}
      </button>
    </div>
  );
}

function UploadPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf7f5]">
      <h2 className="text-3xl font-serif font-bold mb-6">Uploader ma photo</h2>
      {/* Ici viendra l'input d'upload et la session Q&A */}
      <input type="file" accept="image/*" className="mb-4" />
      <div className="bg-white rounded-xl shadow p-6 w-full max-w-md text-center">
        <p>Session Q&A AI (à venir)</p>
      </div>
      <button className="mt-8 bg-black text-white px-6 py-2 rounded-full hover:bg-gray-900 transition">Compléter mon outfit</button>
    </div>
  );
}

function UploadAndAISection({ product }) {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [inpaintingResult, setInpaintingResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMaskComplete = (result) => {
    setInpaintingResult(result);
    setIsProcessing(false);
  };

  return (
    <div className="space-y-4">
      {!inpaintingResult && (
        <h2 className="text-lg font-serif font-bold text-gray-900 mb-2">Upload de votre photo</h2>
      )}
      
      {/* Zone d'upload */}
      {!uploadedImage ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
          <div className="space-y-3">
            <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Uploadez votre photo</h3>
              <p className="text-xs text-gray-500 mb-3">Glissez votre photo ici ou cliquez pour sélectionner</p>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload}
                className="hidden"
                id="photo-upload"
              />
              <label 
                htmlFor="photo-upload"
                className="bg-black text-white px-4 py-2 rounded-full hover:bg-gray-800 transition cursor-pointer inline-block text-sm"
              >
                Choisir une photo
              </label>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-3">
          {inpaintingResult ? (
            <img 
              src={inpaintingResult.images ? `data:image/png;base64,${inpaintingResult.images[0]}` : 
                   inpaintingResult.result_url ? inpaintingResult.result_url : 
                   inpaintingResult.image ? inpaintingResult.image : ''}
              alt="Résultat" 
              className="w-full h-auto max-h-[75vh] object-contain rounded-lg shadow-sm"
            />
          ) : (
            <CanvasEditor 
              uploadedImage={uploadedImage} 
              onMaskComplete={handleMaskComplete}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
              product={product}
            />
          )}
        </div>
      )}
      
      {/* Section Q&A AI - REPOSITIONNEE */}
      <AIAssistant product={product} uploadedImage={uploadedImage} />
      
    </div>
  );
}

function ProductDetail() {
  const { id } = useParams();
  const product = products.find(p => p.id === Number(id));
  const navigate = useNavigate();
  if (!product) return <div className="p-8">Produit introuvable.</div>;
  
  return (
    <div className="min-h-screen bg-[#faf7f5]">
      {/* Header élégant */}
      <header className="bg-white/90 backdrop-blur border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <span 
            className="text-3xl font-serif font-bold tracking-tight text-gray-900 cursor-pointer hover:text-gray-700 transition" 
            onClick={() => navigate('/')}
          >
            fittheoutfit
          </span>
          <button 
            onClick={() => navigate('/')}
            className="bg-black text-white px-6 py-2 rounded-full hover:bg-gray-800 transition font-medium"
          >
            Retour
          </button>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* Partie 1: Article sélectionné */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <img 
                src={product.image} 
                alt={product.name} 
                className="w-full h-[400px] object-contain bg-gray-50 hover:scale-105 transition-transform duration-300" 
              />
            </div>
            
            {/* Informations du produit */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <h1 className="text-xl font-serif font-bold text-gray-900 mb-3">{product.name}</h1>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">{product.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-black">{product.price}</span>
                <button className="bg-black text-white px-4 py-2 rounded-full hover:bg-gray-800 transition font-medium text-sm shadow-lg">
                  Ajouter au panier
                </button>
              </div>
            </div>
          </div>

          {/* Partie 2: Upload et Inpainting */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-lg p-4">
              <UploadAndAISection product={product} />
            </div>
          </div>
        </div>

        {/* Recommandations en bas - pleine largeur */}
        <section className="mt-12">
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h3 className="text-2xl font-serif font-bold text-gray-900 mb-6">Recommandations pour compléter votre outfit</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
              {getRecommendations(product).map((rec) => (
                <div
                  key={rec.id}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition overflow-hidden flex flex-col border border-gray-100 hover:border-black/10 group cursor-pointer"
                  onClick={() => navigate(`/product/${rec.id}`)}
                >
                  <img
                    src={rec.image}
                    alt={rec.name}
                    className="h-80 w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="p-6 flex-1 flex flex-col">
                    <h4 className="text-xl font-semibold text-gray-900 mb-1 font-serif">{rec.name}</h4>
                    <p className="text-gray-500 flex-1 text-base mb-2">{rec.reason}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-black font-bold text-lg">{rec.price}</span>
                      <button className="bg-black text-white px-5 py-2 rounded-full hover:bg-gray-900 transition text-sm font-medium shadow">Voir</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">Ces recommandations sont basées sur votre sélection actuelle</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function App() {
  const navigate = useNavigate();
  return (
    <Routes>
      <Route path="/" element={
        <div className="min-h-screen flex flex-col bg-[#faf7f5]">
          {/* Header */}
          <header className="bg-white/90 backdrop-blur border-b border-gray-100 sticky top-0 z-20">
            <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
              <span className="text-3xl font-serif font-bold tracking-tight text-gray-900">fittheoutfit</span>
              <nav>
                <ul className="flex space-x-8 text-gray-700 font-medium text-lg">
                  <li><a href="#" className="hover:text-black transition">Nouveautés</a></li>
                  <li><a href="#" className="hover:text-black transition">Vêtements</a></li>
                  <li><a href="#" className="hover:text-black transition">Accessoires</a></li>
                  <li><a href="#" className="hover:text-black transition">Contact</a></li>
                </ul>
              </nav>
              <button className="relative group">
                <svg className="w-7 h-7 text-gray-700 group-hover:text-black transition" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m13-9l2 9m-5-9V6a2 2 0 10-4 0v7" /></svg>
                <span className="absolute -top-2 -right-2 bg-black text-white text-xs rounded-full px-1">0</span>
              </button>
            </div>
          </header>
          {/* Hero Banner */}
          <section className="relative bg-white py-0 mb-12 overflow-hidden">
            <div className="relative max-w-3xl mx-auto px-4 py-24 text-center flex flex-col items-center">
              <span className="px-4 py-1 rounded-full text-sm font-medium tracking-wide bg-gray-100 text-gray-900 mb-4">Nouvelle saison</span>
              <h1 className="text-6xl font-serif font-bold mb-6 text-gray-900">Pick it. Fit it. Style it.</h1>
              <a href="#" className="inline-block px-10 py-3 rounded-full font-semibold shadow bg-black text-white hover:bg-gray-900 transition text-lg tracking-wide">Découvrir la collection</a>
            </div>
          </section>
          {/* Section Nouveautés */}
          <section className="max-w-7xl mx-auto px-6 mb-12">
            <h2 className="text-3xl font-serif font-bold text-gray-900 mb-8">Nouveautés</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
              {products.slice(0,3).map(product => (
                <div key={product.id} className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition overflow-hidden flex flex-col border border-gray-100 hover:border-black/10 group cursor-pointer" onClick={() => navigate(`/product/${product.id}`)}>
                  <img src={product.image} alt={product.name} className="h-80 w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="p-6 flex-1 flex flex-col">
                    <h4 className="text-xl font-semibold text-gray-900 mb-1 font-serif">{product.name}</h4>
                    <p className="text-gray-500 flex-1 text-base mb-2">{product.description}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-black font-bold text-lg">{product.price}</span>
                      <button className="bg-black text-white px-5 py-2 rounded-full hover:bg-gray-900 transition text-sm font-medium shadow">Ajouter</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
          {/* Grille produits */}
          <main className="max-w-7xl mx-auto px-6 pb-16">
            <h3 className="text-2xl font-serif font-bold text-gray-900 mb-8">Notre sélection</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
              {products.map(product => (
                <div key={product.id} className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition overflow-hidden flex flex-col border border-gray-100 hover:border-black/10 group cursor-pointer" onClick={() => navigate(`/product/${product.id}`)}>
                  <img src={product.image} alt={product.name} className="h-80 w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="p-6 flex-1 flex flex-col">
                    <h4 className="text-xl font-semibold text-gray-900 mb-1 font-serif">{product.name}</h4>
                    <p className="text-gray-500 flex-1 text-base mb-2">{product.description}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-black font-bold text-lg">{product.price}</span>
                      <button className="bg-black text-white px-5 py-2 rounded-full hover:bg-gray-900 transition text-sm font-medium shadow">Ajouter</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </main>
          {/* Footer */}
          <footer className="bg-white border-t border-gray-100 mt-auto">
            <div className="max-w-7xl mx-auto px-6 py-8 text-center text-gray-400 text-base font-light">
              © 2024 fittheoutfit. Tous droits réservés.
            </div>
          </footer>
        </div>
      } />
      <Route path="/upload" element={<UploadPage />} />
      <Route path="/product/:id" element={<ProductDetail />} />
    </Routes>
  );
}

export default App;
