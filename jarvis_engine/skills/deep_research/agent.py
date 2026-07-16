import os
import json
import chromadb
from duckduckgo_search import DDGS

class DeepResearchAgent:
    def __init__(self):
        # Inicializa o ChromaDB guardando o cache no sub-diretório de db
        self.chroma_client = chromadb.PersistentClient(path="jarvis_memory.db_chroma")
        self.collection = self.chroma_client.get_or_create_collection(name="internal_docs")
        self.ddgs = DDGS()

    def index_document(self, doc_id: str, content: str, metadata: dict = None):
        """Indexa um documento local fornecido no repositório de vetores para busca profunda posterior."""
        if metadata is None:
            metadata = {}
        metadata["source"] = "local_vault"
        
        # O Chroma se encarrega nativamente de embutir via model standard (all-MiniLM-L6-v2) localmente
        self.collection.add(
            documents=[content],
            metadatas=[metadata],
            ids=[doc_id]
        )
        print(f"[Deep Research] Documento {doc_id} indexado localmente.")

    def search_local(self, query: str, n_results: int = 3) -> list:
        results = self.collection.query(query_texts=[query], n_results=n_results)
        return results

    def search_web(self, query: str, num_results: int = 5) -> list:
        print(f"[Deep Research] Operando consulta Web no DuckDuckGo: '{query}'")
        results = []
        try:
            for item in self.ddgs.text(query, max_results=num_results):
                results.append(item)
        except Exception as e:
            print("[Erro DuckDuckGo]:", str(e))
        return results

    def execute_research(self, topic: str):
        # Simula a orquestração do loop (em produção isso passa pelo GROQ LLM para RAG puro)
        print(f"\n[Deep Research Pipeline] Iniciando investigação sobre: {topic}")
        local_results = self.search_local(topic)
        web_results = self.search_web(topic)
        
        context_block = "=== MODO OMNI-SEARCH ATIVADO ===\n"
        
        context_block += "## EVIDÊNCIAS INTERNAS (ChromaDB)\n"
        if local_results['documents'] and len(local_results['documents'][0]) > 0:
            for d, doc in enumerate(local_results['documents'][0]):
                meta = local_results['metadatas'][0][d]
                context_block += f"- [{meta.get('source', 'Vault')}] {doc}\n"
        else:
            context_block += "Nenhuma memória local encontrada para este tema.\n"
            
        context_block += "\n## EVIDÊNCIAS NA WEB (DuckDuckGo)\n"
        for idx, web in enumerate(web_results):
             context_block += f"- Fonte: {web.get('title')} ({web.get('href')})\n  Snippet: {web.get('body')}\n\n"
             
        # Isso alimenta o prompt do Llama 3!
        print(context_block)
        return context_block

# Factory method required by the dispatcher
def create_agent():
    return DeepResearchAgent()
