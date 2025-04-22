import sys
import base64
import zipfile
import json
import tempfile
import os
import subprocess

def process_base64_zip(base64_string):
    # Décodage de la chaîne base64
    zip_data = base64.b64decode(base64_string)
    
    # Création d'un fichier temporaire pour le ZIP
    temp_dir = tempfile.mkdtemp()
    temp_zip_path = os.path.join(temp_dir, 'temp.zip')
    
    with open(temp_zip_path, 'wb') as temp_zip:
        temp_zip.write(zip_data)
    
    # Extraction et lecture du contenu du ZIP
    json_content = None
    
    with zipfile.ZipFile(temp_zip_path, 'r') as zip_ref:
        for info in zip_ref.infolist():
            content = zip_ref.read(info)
            try:
                # Essai de décodage en JSON
                json_content = json.loads(content)
                break  # On prend le premier fichier JSON valide
            except json.JSONDecodeError:
                continue
    
    if json_content:
        # Création d'un fichier JSON temporaire
        json_temp_path = os.path.join(temp_dir, 'temp.json')
        
        # Formatage du JSON avec indentation
        with open(json_temp_path, 'w', encoding='utf-8') as f:
            json.dump(json_content, f, indent=2, ensure_ascii=False)
        
        # Ouverture du fichier dans Firefox
        try:
            # Utilisation de la commande 'open' pour Mac OS
            subprocess.run(['open', '-a', 'Firefox', json_temp_path])
            print(f"Le fichier JSON a été ouvert dans Firefox: {json_temp_path}")
            print("Ne supprimez pas le fichier temporaire tant que vous l'utilisez.")
        except Exception as e:
            print(f"Erreur lors de l'ouverture dans Firefox: {e}")
            print(f"Le fichier JSON a été enregistré ici: {json_temp_path}")
    else:
        print("Aucun contenu JSON valide trouvé dans l'archive.")
        # Nettoyage des fichiers temporaires si pas de JSON
        os.remove(temp_zip_path)
        os.rmdir(temp_dir)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python script.py <chaîne_base64>")
        sys.exit(1)
    
    process_base64_zip(sys.argv[1])
