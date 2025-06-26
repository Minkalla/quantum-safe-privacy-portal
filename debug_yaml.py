#!/usr/bin/env python3
import yaml

def debug_yaml_error(file_path):
    try:
        with open(file_path, 'r') as file:
            content = file.read()
            lines = content.split('\n')
            
        print(f"Analyzing line 79 (0-indexed line 78):")
        if len(lines) > 78:
            line79 = lines[78]
            print(f"Line 79: {repr(line79)}")
            print(f"Length: {len(line79)}")
            if len(line79) > 54:
                print(f"Character at position 55: {repr(line79[54])}")
                print(f"Characters 50-60: {repr(line79[49:60])}")
            else:
                print("Line is shorter than 55 characters")
        
        yaml.safe_load(content)
        print("✅ YAML is valid")
        
    except yaml.YAMLError as e:
        print(f"❌ YAML Error: {e}")
        if hasattr(e, 'problem_mark'):
            mark = e.problem_mark
            print(f"Error at line {mark.line + 1}, column {mark.column + 1}")
    except Exception as e:
        print(f"❌ Other error: {e}")

if __name__ == "__main__":
    debug_yaml_error(".github/workflows/pqc-pipeline-validation.yml")
