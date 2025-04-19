from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

@app.route('/responder', methods=['POST'])
def responder():
    try:
        data = request.get_json()
        mensagem = data.get('mensagem', '')

        if not mensagem:
            return jsonify({'erro': 'Mensagem vazia'}), 400

        # Faz a requisição para o Ollama (modelo local)
        resposta = requests.post('http://localhost:11434/api/generate', json={
            "model": "llama3",
            "prompt": mensagem,
            "stream": False
        })

        resposta.raise_for_status()
        resultado = resposta.json()
        resposta_texto = resultado.get("response", "").strip()

        return jsonify({'resposta': resposta_texto})

    except Exception as e:
        print("Erro ao gerar resposta:", e)
        return jsonify({'erro': f'Erro ao gerar resposta: {str(e)}'}), 500

if __name__ == '__main__':
    print("Servidor Flask iniciado em http://localhost:5000")
    app.run(debug=True)
