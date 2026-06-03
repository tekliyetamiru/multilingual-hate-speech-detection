import torch
import torch.nn as nn
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import re
import sys
import model as this_module

class MultilingualToxicModel(nn.Module):
    def __init__(self, model_name="xlm-roberta-base", num_labels=6):
        super().__init__()
        self.backbone = AutoModelForSequenceClassification.from_pretrained(
            model_name,
            num_labels=num_labels,
            problem_type="multi_label_classification"
        )
    def forward(self, input_ids, attention_mask):
        return self.backbone(input_ids=input_ids, attention_mask=attention_mask).logits

def detect_language_simple(text):
    # (same as before)
    text = str(text)
    if len(text.strip()) == 0:
        return 'unknown'
    amharic_chars = sum(1 for char in text if '\u1200' <= char <= '\u137F')
    latin_chars = sum(1 for char in text if 'a' <= char.lower() <= 'z')
    if amharic_chars > len(text) * 0.1:
        return 'am'
    elif latin_chars > 0:
        text_lower = text.lower()
        oromo_indicators = ['kan', 'akka', 'waliin', 'irratti', 'itti', 'qabu', 'fi', 'keessa', 'irra', 'itti', 'waliin', 'hinta', 'hin', 'ni', 'jedhe', 'jedhan', 'jira', 'jirtu']
        english_indicators = ['the', 'and', 'you', 'for', 'are', 'this', 'that', 'with', 'have', 'from', 'they', 'there', 'their']
        oromo_count = sum(1 for word in oromo_indicators if word in text_lower)
        english_count = sum(1 for word in english_indicators if word in text_lower)
        if oromo_count > english_count:
            return 'om'
        else:
            return 'en'
    else:
        return 'unknown'

class MultilingualTextPreprocessor:
    # (same as before)
    def __init__(self):
        self.url_pattern = re.compile(r'https?://\S+|www\.\S+')
        self.email_pattern = re.compile(r'\S+@\S+')
        self.mention_pattern = re.compile(r'@\w+')
        self.number_pattern = re.compile(r'\d+')
    def preprocess_english(self, text):
        text = str(text).lower()
        text = self.url_pattern.sub('', text)
        text = self.email_pattern.sub('', text)
        text = self.mention_pattern.sub('', text)
        text = self.number_pattern.sub('', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text
    def preprocess_amharic(self, text):
        text = str(text)
        text = self.url_pattern.sub('', text)
        text = self.email_pattern.sub('', text)
        text = self.mention_pattern.sub('', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text
    def preprocess_oromo(self, text):
        text = str(text).lower()
        text = self.url_pattern.sub('', text)
        text = self.email_pattern.sub('', text)
        text = self.mention_pattern.sub('', text)
        text = self.number_pattern.sub('', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text
    def preprocess(self, text, language):
        if language == 'en':
            return self.preprocess_english(text)
        elif language == 'am':
            return self.preprocess_amharic(text)
        elif language == 'om':
            return self.preprocess_oromo(text)
        else:
            return str(text)

def load_model(quantized_path='quantized_model_full.pt', metadata_path='final_multilingual_toxic_model.pt'):
    # Ensure our custom model class is known
    if not hasattr(sys.modules['__main__'], 'MultilingualToxicModel'):
        sys.modules['__main__'].MultilingualToxicModel = this_module.MultilingualToxicModel

    # --- PATCH for missing XLMRobertaSdpaSelfAttention ---
    import transformers.models.xlm_roberta.modeling_xlm_roberta as xlm_roberta_module
    if not hasattr(xlm_roberta_module, 'XLMRobertaSdpaSelfAttention'):
        class XLMRobertaSdpaSelfAttention(xlm_roberta_module.XLMRobertaSelfAttention):
            pass
        xlm_roberta_module.XLMRobertaSdpaSelfAttention = XLMRobertaSdpaSelfAttention
    # ----------------------------------------------------

    metadata = torch.load(metadata_path, map_location='cpu', weights_only=False, mmap=True)
    thresholds = metadata['thresholds']
    label_columns = metadata['label_columns']

    quantized_model = torch.load(quantized_path, map_location='cpu', weights_only=False, mmap=True)
    
    if isinstance(quantized_model, MultilingualToxicModel):
        model = quantized_model
    else:
        model = MultilingualToxicModel(num_labels=6)
        model.load_state_dict(quantized_model)
    model.eval()
    tokenizer = AutoTokenizer.from_pretrained('xlm-roberta-base')
    preprocessor = MultilingualTextPreprocessor()
    return model, thresholds, label_columns, tokenizer, preprocessor

def predict_toxicity(text, model, thresholds, label_columns, tokenizer, preprocessor):
    lang = detect_language_simple(text)
    processed = preprocessor.preprocess(text, lang)
    inputs = tokenizer(processed, return_tensors='pt', truncation=True, max_length=256)
    with torch.no_grad():
        logits = model(inputs['input_ids'], inputs['attention_mask'])
        probs = torch.sigmoid(logits).squeeze().tolist()
    toxic_categories = [label_columns[i] for i, p in enumerate(probs) if p > thresholds[i]]
    return {
        'language': lang,
        'probabilities': dict(zip(label_columns, probs)),
        'is_toxic': len(toxic_categories) > 0,
        'toxic_categories': toxic_categories
    }