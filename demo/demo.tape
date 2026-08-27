# Agent Toolsmith — demo recording
#
# Requires ANTHROPIC_API_KEY or OPENAI_API_KEY in the environment.

Output demo/demo.gif

Set Shell "bash"
Set Width 1000
Set Height 620
Set Padding 20
Set FontSize 14
Set Framerate 24
Set TypingSpeed 60ms
Set WaitTimeout 20s

Env PS1 "❯ "

# -----------------------------------------------------------------------------
# Step 1 — it starts with no tools
# -----------------------------------------------------------------------------

Type "./toolsmith"
Sleep 100ms
Enter
Wait+Screen /Agent Toolsmith/
Sleep 1000ms

Type "/tools"
Sleep 500ms
Enter
Wait+Screen /No tools available/
Sleep 2000ms

# -----------------------------------------------------------------------------
# Step 2 — ask for something the model can't do
# -----------------------------------------------------------------------------

Type "what are the 5 biggest files in src/?"
Sleep 500ms
Enter

Wait+Screen /Worked for/
Sleep 2000ms

Type "/clear"
Sleep 500ms
Enter
Sleep 1000ms

Type "/tools"
Sleep 500ms
Enter
Sleep 2000ms
Escape
Sleep 500ms

Type "now the 5 biggest files in tests/"
Enter

Wait+Screen /Worked for/
Sleep 3s

Type "/exit"
Sleep 500ms
Enter
Sleep 1000ms

# -----------------------------------------------------------------------------
# Step 3 — restart; the tool it wrote is still there
# -----------------------------------------------------------------------------

Type "./toolsmith"
Sleep 100ms
Enter
Wait+Screen /Agent Toolsmith/
Sleep 1000ms

Type "/tools"
Sleep 500ms
Enter
Sleep 1500ms

Type "tools persist across sessions..."
Sleep 1000ms
Backspace 32
Type "/exit"
Sleep 500ms
Enter
