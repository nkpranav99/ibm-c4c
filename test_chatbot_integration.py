"""
Test script for Watson Hybrid Chatbot Integration
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_query(query, description):
    """Test a chatbot query"""
    print(f"\n{'='*60}")
    print(f"TEST: {description}")
    print(f"Query: {query}")
    print(f"{'='*60}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/chatbot/chat",
            headers={"Content-Type": "application/json"},
            json={"message": query},
            timeout=30
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\nResponse:")
            print(f"{data['message'][:500]}...")
            
            if data.get('listings'):
                print(f"\n📦 Found {len(data['listings'])} listings")
            
            if data.get('suggestions'):
                print(f"\n💡 Suggestions:")
                for sug in data['suggestions'][:3]:
                    print(f"   - {sug}")
            
            print("✅ Success!")
            return True
        else:
            print(f"❌ Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False


def main():
    print("\n🧪 Testing Watson Hybrid Chatbot Integration\n")
    
    # Check if backend is running
    try:
        health = requests.get(f"{BASE_URL}/health", timeout=5)
        if health.status_code != 200:
            print("❌ Backend not running. Please start with: uvicorn app.main:app --reload")
            return
        print("✅ Backend is running\n")
    except:
        print("❌ Backend not running. Please start with: uvicorn app.main:app --reload")
        return
    
    # Test queries
    test_cases = [
        # Data queries (should use Orchestrate agent)
        ("What plastic waste materials are available?", "Waste Data Query"),
        ("Tell me about HDPE scrap in Mumbai", "Specific Material Query"),
        ("I want to start a plastic recycling business", "Business Query"),
        ("What machinery is available for processing paper?", "Machinery Query"),
        
        # General queries (should use Watsonx or rule-based)
        ("Hello", "Greeting"),
        ("How do I list materials?", "Platform Query"),
        ("How does bidding work?", "Feature Query"),
        
        # Mixed
        ("What are the benefits?", "Benefits Query"),
        ("Show me biofuel opportunities", "Business Opportunity Query"),
    ]
    
    results = []
    for query, description in test_cases:
        result = test_query(query, description)
        results.append(result)
    
    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    print(f"Total tests: {len(results)}")
    print(f"Successful: {sum(results)}")
    print(f"Failed: {len(results) - sum(results)}")
    
    if all(results):
        print("\n🎉 All tests passed!")
    else:
        print("\n⚠️  Some tests failed")
        print("\nCheck backend logs to see which service was used for each query")


if __name__ == "__main__":
    main()

