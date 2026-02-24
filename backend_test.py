#!/usr/bin/env python3
"""
OJYQ React Native App - Testing Suite
=====================================

Tests pour vérifier:
1. Compilation TypeScript sans erreur
2. Imports des nouveaux types depuis /app/types/models.ts  
3. Imports des nouveaux composants (EventCard, PollBubble, ChannelItem, CallControls)
4. Imports du hook useTheme et des couleurs
5. Structure des fichiers dans /app/components/chat/ et /app/components/calendar/
"""

import subprocess
import sys
import os
import json
from datetime import datetime
from pathlib import Path

class OJYQTester:
    def __init__(self):
        self.project_root = "/app"
        self.tests_run = 0
        self.tests_passed = 0
        self.issues = []
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Enregistre le résultat d'un test"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}: PASSED")
        else:
            print(f"❌ {test_name}: FAILED - {details}")
            self.issues.append(f"{test_name}: {details}")
        
        if details:
            print(f"   📋 {details}")
        print()

    def test_typescript_config(self):
        """Vérifie la configuration TypeScript"""
        print("🔍 Test 1: Configuration TypeScript")
        
        try:
            tsconfig_path = os.path.join(self.project_root, "tsconfig.json")
            
            if not os.path.exists(tsconfig_path):
                self.log_test("TypeScript Config", False, "tsconfig.json non trouvé")
                return
                
            with open(tsconfig_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            if '"strict": true' in content:
                self.log_test("TypeScript Strict Mode", True, "Mode strict activé")
            else:
                self.log_test("TypeScript Strict Mode", False, "Mode strict non activé")
                
        except Exception as e:
            self.log_test("TypeScript Config", False, f"Erreur: {str(e)}")

    def test_package_json_dependencies(self):
        """Vérifie les dépendances dans package.json"""
        print("🔍 Test 2: Dépendances package.json")
        
        try:
            package_json_path = os.path.join(self.project_root, "package.json")
            
            with open(package_json_path, 'r', encoding='utf-8') as f:
                package_data = json.load(f)
                
            deps = package_data.get('dependencies', {})
            
            required_deps = [
                'firebase',
                'react-native-gifted-chat',
                '@react-native-community/datetimepicker',
                '@expo/vector-icons'
            ]
            
            missing_deps = []
            for dep in required_deps:
                if dep not in deps:
                    missing_deps.append(dep)
                    
            if missing_deps:
                self.log_test("Dependencies", False, f"Manquantes: {', '.join(missing_deps)}")
            else:
                self.log_test("Dependencies", True, "Toutes les dépendances requises présentes")
                
        except Exception as e:
            self.log_test("Dependencies", False, f"Erreur: {str(e)}")

    def test_types_models_import(self):
        """Teste l'import des types depuis models.ts"""
        print("🔍 Test 3: Import des types depuis models.ts")
        
        try:
            models_path = os.path.join(self.project_root, "types", "models.ts")
            
            if not os.path.exists(models_path):
                self.log_test("Models Types", False, "/app/types/models.ts non trouvé")
                return
                
            with open(models_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Vérifier la présence des types clés
            required_types = [
                'export interface Channel',
                'export interface Message', 
                'export interface Poll',
                'export interface CalendarEvent',
                'export interface Call',
                'export type EventType',
                'export type CallType'
            ]
            
            missing_types = []
            for type_def in required_types:
                if type_def not in content:
                    missing_types.append(type_def.replace('export interface ', '').replace('export type ', ''))
                    
            if missing_types:
                self.log_test("Models Types", False, f"Types manquants: {', '.join(missing_types)}")
            else:
                self.log_test("Models Types", True, "Tous les types requis présents")
                
        except Exception as e:
            self.log_test("Models Types", False, f"Erreur: {str(e)}")

    def test_components_structure(self):
        """Vérifie la structure des composants"""
        print("🔍 Test 4: Structure des composants")
        
        # Composants Chat
        chat_components = [
            "PollBubble.tsx",
            "CallControls.tsx", 
            "ChannelItem.tsx"
        ]
        
        chat_dir = os.path.join(self.project_root, "components", "chat")
        missing_chat = []
        
        for component in chat_components:
            if not os.path.exists(os.path.join(chat_dir, component)):
                missing_chat.append(component)
                
        if missing_chat:
            self.log_test("Chat Components", False, f"Manquants: {', '.join(missing_chat)}")
        else:
            self.log_test("Chat Components", True, "Tous les composants chat présents")
            
        # Composants Calendar
        calendar_components = ["EventCard.tsx"]
        calendar_dir = os.path.join(self.project_root, "components", "calendar")
        missing_calendar = []
        
        for component in calendar_components:
            if not os.path.exists(os.path.join(calendar_dir, component)):
                missing_calendar.append(component)
                
        if missing_calendar:
            self.log_test("Calendar Components", False, f"Manquants: {', '.join(missing_calendar)}")
        else:
            self.log_test("Calendar Components", True, "Tous les composants calendar présents")

    def test_theme_system(self):
        """Vérifie le système de thème"""
        print("🔍 Test 5: Système de thème")
        
        try:
            # Vérifier colors.ts
            colors_path = os.path.join(self.project_root, "theme", "colors.ts")
            if not os.path.exists(colors_path):
                self.log_test("Theme Colors", False, "/app/theme/colors.ts non trouvé")
                return
                
            with open(colors_path, 'r', encoding='utf-8') as f:
                colors_content = f.read()
                
            # Vérifier useTheme.ts
            hook_path = os.path.join(self.project_root, "hooks", "useTheme.ts")
            if not os.path.exists(hook_path):
                self.log_test("useTheme Hook", False, "/app/hooks/useTheme.ts non trouvé")
                return
                
            with open(hook_path, 'r', encoding='utf-8') as f:
                hook_content = f.read()
                
            # Vérifier les thèmes
            theme_checks = [
                "export const LightTheme" in colors_content,
                "export const DarkTheme" in colors_content,
                "export const useTheme" in hook_content,
                "Colors.navy" in colors_content,
                "Colors.sky" in colors_content
            ]
            
            if all(theme_checks):
                self.log_test("Theme System", True, "Système de thème complet (mode sombre/clair)")
            else:
                self.log_test("Theme System", False, "Configuration thème incomplète")
                
        except Exception as e:
            self.log_test("Theme System", False, f"Erreur: {str(e)}")

    def test_imports_in_screens(self):
        """Vérifie les imports dans les écrans principaux"""
        print("🔍 Test 6: Imports dans les écrans")
        
        screens = {
            "Chat Screen": "app/(tabs)/chat.tsx",
            "Calendar Screen": "app/(tabs)/calendar.tsx", 
            "Channel Screen": "app/channel/[id].tsx"
        }
        
        for screen_name, screen_path in screens.items():
            try:
                full_path = os.path.join(self.project_root, screen_path)
                
                if not os.path.exists(full_path):
                    self.log_test(f"{screen_name} Imports", False, f"{screen_path} non trouvé")
                    continue
                    
                with open(full_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                # Vérifier les imports essentiels
                required_imports = []
                if "chat" in screen_path:
                    required_imports = [
                        "from '../../types/models'",
                        "from '../../hooks/useTheme'",
                        "ChannelItem"
                    ]
                elif "calendar" in screen_path:
                    required_imports = [
                        "from '../../types/models'",
                        "from '../../hooks/useTheme'",
                        "EventCard"
                    ]
                elif "channel" in screen_path:
                    required_imports = [
                        "from '../../types/models'",
                        "PollBubble",
                        "CallControls"
                    ]
                    
                missing_imports = []
                for imp in required_imports:
                    if imp not in content:
                        missing_imports.append(imp)
                        
                if missing_imports:
                    self.log_test(f"{screen_name} Imports", False, f"Manquants: {', '.join(missing_imports)}")
                else:
                    self.log_test(f"{screen_name} Imports", True, "Tous les imports présents")
                    
            except Exception as e:
                self.log_test(f"{screen_name} Imports", False, f"Erreur: {str(e)}")

    def test_firebase_config(self):
        """Vérifie la configuration Firebase"""
        print("🔍 Test 7: Configuration Firebase")
        
        try:
            config_path = os.path.join(self.project_root, "firebaseConfig.ts")
            
            if not os.path.exists(config_path):
                self.log_test("Firebase Config", False, "firebaseConfig.ts non trouvé")
                return
                
            with open(config_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Vérifier que la configuration utilise bien les variables d'environnement
            required_patterns = [
                "process.env.EXPO_PUBLIC_FIREBASE_API_KEY",
                "process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID", 
                "process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"
            ]
            
            config_ok = all(pattern in content for pattern in required_patterns)
            
            # Vérifier aussi le fichier .env
            env_path = os.path.join(self.project_root, ".env")
            if os.path.exists(env_path):
                with open(env_path, 'r', encoding='utf-8') as env_file:
                    env_content = env_file.read()
                    env_ok = "EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyCG5BvCYM0jIRtWh55wCjjn1tjTK0T481Y" in env_content
                    config_ok = config_ok and env_ok
            
            if config_ok:
                self.log_test("Firebase Config", True, "Configuration Firebase correcte")
            else:
                self.log_test("Firebase Config", False, "Configuration Firebase incomplète")
                
        except Exception as e:
            self.log_test("Firebase Config", False, f"Erreur: {str(e)}")

    def test_typescript_compilation_check(self):
        """Vérifie si TypeScript peut être vérifié (simulation)"""
        print("🔍 Test 8: Vérification TypeScript")
        
        try:
            os.chdir(self.project_root)
            
            # Vérifier si node_modules existe
            node_modules_path = os.path.join(self.project_root, "node_modules")
            
            if not os.path.exists(node_modules_path):
                self.log_test("TypeScript Check", False, "node_modules manquant - exécuter 'yarn install'")
                return
                
            # Simuler une vérification TypeScript basique
            result = subprocess.run(
                ["npx", "tsc", "--noEmit", "--skipLibCheck"],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                self.log_test("TypeScript Compilation", True, "Aucune erreur de compilation TypeScript")
            else:
                error_lines = result.stderr.split('\n')[:5]  # Premières erreurs seulement
                self.log_test("TypeScript Compilation", False, f"Erreurs: {' | '.join(error_lines)}")
                
        except subprocess.TimeoutExpired:
            self.log_test("TypeScript Check", False, "Timeout lors de la vérification TypeScript")
        except Exception as e:
            self.log_test("TypeScript Check", False, f"Impossible de vérifier TypeScript: {str(e)}")

    def run_all_tests(self):
        """Exécute tous les tests"""
        print("🚀 OJYQ React Native - Tests de Refactorisation")
        print("=" * 50)
        print()
        
        # Exécuter tous les tests
        self.test_typescript_config()
        self.test_package_json_dependencies()
        self.test_types_models_import()
        self.test_components_structure() 
        self.test_theme_system()
        self.test_imports_in_screens()
        self.test_firebase_config()
        self.test_typescript_compilation_check()
        
        # Résumé final
        print("=" * 50)
        print(f"📊 RÉSULTATS: {self.tests_passed}/{self.tests_run} tests réussis")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Taux de succès: {success_rate:.1f}%")
        
        if self.issues:
            print("\n❌ Problèmes détectés:")
            for issue in self.issues:
                print(f"   • {issue}")
        else:
            print("\n✅ Tous les tests sont réussis!")
        
        return success_rate >= 80  # Considéré comme réussi si 80%+ des tests passent

def main():
    tester = OJYQTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())