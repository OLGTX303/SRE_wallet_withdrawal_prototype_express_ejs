import matplotlib.pyplot as plt
import numpy as np

# X axis: Degree of Implementation
x = np.linspace(0, 10, 100)

# Kano curves
must_be = -np.exp(-x) + 0.2              # Must-Be curve
performance = (x / 10) - 0.5             # Performance curve
attractive = np.log(x + 1) / 2 - 0.5     # Attractive curve

# Create figure
plt.figure(figsize=(8, 6))

# Plot curves
plt.plot(x, must_be, label="Must-Be Requirements", linewidth=2)
plt.plot(x, performance, label="Performance Requirements", linewidth=2)
plt.plot(x, attractive, label="Attractive Requirements", linewidth=2)

# Axes labels
plt.xlabel("Degree of Implementation")
plt.ylabel("Customer Satisfaction")

# Axis limits
plt.xlim(0, 10)
plt.ylim(-1.2, 1.2)

# Reference lines
plt.axhline(0, linewidth=1)
plt.axvline(0, linewidth=1)

# Annotations
plt.text(1, -0.9, "Must-Be:\n• Reinvest form\n• Confirmation\n• Correct wallet debit", fontsize=9)
plt.text(4, -0.1, "Performance:\n• Eligibility feedback\n• Fraud & AML screening\n• Clear messages", fontsize=9)
plt.text(6, 0.5, "Attractive:\n• Security tips\n• Audit transparency\n• Reporting feature", fontsize=9)

# Title
plt.title("Kano Model Mapping for UC-008 Reinvest Funds")

# Legend
plt.legend()

# Grid
plt.grid(True, linestyle="--", alpha=0.5)

# Save output
plt.savefig("Kano_Model_UC008.png", dpi=300, bbox_inches="tight")

# Show plot (optional)
plt.show()
import matplotlib.pyplot as plt
import numpy as np

# X axis: Degree of Implementation
x = np.linspace(0, 10, 100)

# Kano curves
must_be = -np.exp(-x) + 0.2              # Must-Be curve
performance = (x / 10) - 0.5             # Performance curve
attractive = np.log(x + 1) / 2 - 0.5     # Attractive curve

# Create figure
plt.figure(figsize=(8, 6))

# Plot curves
plt.plot(x, must_be, label="Must-Be Requirements", linewidth=2)
plt.plot(x, performance, label="Performance Requirements", linewidth=2)
plt.plot(x, attractive, label="Attractive Requirements", linewidth=2)

# Axes labels
plt.xlabel("Degree of Implementation")
plt.ylabel("Customer Satisfaction")

# Axis limits
plt.xlim(0, 10)
plt.ylim(-1.2, 1.2)

# Reference lines
plt.axhline(0, linewidth=1)
plt.axvline(0, linewidth=1)

# Annotations
plt.text(1, -0.9, "Must-Be:\n• Reinvest form\n• Confirmation\n• Correct wallet debit", fontsize=9)
plt.text(4, -0.1, "Performance:\n• Eligibility feedback\n• Fraud & AML screening\n• Clear messages", fontsize=9)
plt.text(6, 0.5, "Attractive:\n• Security tips\n• Audit transparency\n• Reporting feature", fontsize=9)

# Title
plt.title("Kano Model Mapping for UC-008 Reinvest Funds")

# Legend
plt.legend()

# Grid
plt.grid(True, linestyle="--", alpha=0.5)

# Save output
plt.savefig("Kano_Model_UC008.png", dpi=300, bbox_inches="tight")

# Show plot (optional)
plt.show()
