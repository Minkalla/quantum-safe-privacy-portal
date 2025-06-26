#!/usr/bin/env python3
import yaml
import sys

def check_yaml_syntax(file_path):
    try:
        with open(file_path, 'r') as file:
            yaml.safe_load(file)
        print(f"✅ YAML syntax is valid in {file_path}")
        return True
    except yaml.YAMLError as e:
        print(f"❌ YAML syntax error in {file_path}:")
        print(f"Error: {e}")
        return False
    except FileNotFoundError:
        print(f"❌ File not found: {file_path}")
        return False

if __name__ == "__main__":
    file_path = ".github/workflows/pqc-pipeline-validation.yml"
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    
    is_valid = check_yaml_syntax(file_path)
    sys.exit(0 if is_valid else 1)
