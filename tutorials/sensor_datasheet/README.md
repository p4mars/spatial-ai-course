# Sensor Datasheet Quiz: Frame Rate, Image Size, and Storage

This notebook recaps the sensor architecture fundamentals introduced in the lecture and guides you through a practical bandwidth and storage analysis using a real camera datasheet. You will work with the **Allied Vision Manta G-235C**, the same camera shown in the lecture slides, and calculate how much data it produces and how long you can record given realistic hardware constraints.

In this notebook, you will:

1. Read a real camera sensor datasheet and extract the relevant specifications.
2. Calculate the raw image size in bytes for different pixel formats.
3. Determine the maximum frame rate that fits within a given communication bandwidth.
4. Determine the maximum recording time that fits within a given memory capacity.
5. Explore how resolution, compression, and pixel format affect system design trade-offs.

<details>

<summary>Related lecture material</summary>

This notebook connects directly to the following topics from the *Practical Topics in Spatial AI* lecture:

- Sensor architecture pipeline: Sensing Unit → Processing Unit → Transmission Unit
- Camera datasheets: resolution, bit depth, pixel formats, frame rate
- Communication interfaces and bandwidth constraints
- Memory budgeting for robotic missions

</details>

## Table of Contents

1. [Recap](#1-recap)
2. [Requirements](#2-requirements)
3. [System Parameters](#3-system-parameters)
4. [Exercises](#4-exercises)
5. [Troubleshooting](#5-troubleshooting)
6. [References](#6-references)


# 1. Recap

## 1.1 The sensor architecture pipeline

Every camera sensor in a robotic system passes data through three stages:

```text
Sensing Unit  →  Processing Unit  →  Transmission Unit
    ↓                  ↓                     ↓
 Pixels           Memory / ISP           Interface
 (ADC)           (frame buffer)        (USB, GigE, ...)
```

Two hardware resources constrain how much image data your system can handle:

| Resource | What it limits |
|---|---|
| **Communication bandwidth** | How many frames per second you can transmit |
| **Memory capacity** | How long you can store images |

Understanding these limits is essential when designing a vision system for a robot. If you exceed the bandwidth, frames are dropped. If you exceed the memory, recording stops early.

## 1.2 Image size

A raw (uncompressed) image occupies:

$$
\text{Image size} = N_u \times N_v \times \text{bit depth} / 8 \quad [\text{bytes}]
$$

For a colour image with multiple channels:

$$
\text{Image size} = N_u \times N_v \times \text{bit depth} \times n_{\text{channels}} / 8 \quad [\text{bytes}]
$$

## 1.3 Bandwidth and frame rate

If your communication link has a bandwidth of $B$ bits/s and one image occupies $S$ bytes:

$$
f_{\text{max,link}} = \frac{B}{S \times 8} \quad [\text{fps}]
$$

The effective maximum frame rate is also limited by the sensor hardware itself:

$$
f_{\text{max}} = \min\left(f_{\text{max,link}},\ f_{\text{sensor max}}\right)
$$

## 1.4 Recording time

With a memory capacity of $M$ bytes, recording at frame rate $f$:

$$
t_{\text{max}} = \frac{M}{S \times f} \quad [\text{seconds}]
$$

---

# 2. Requirements

## 2.1 Python dependencies

This notebook requires:

- Python 3
- NumPy
- Matplotlib

No hardware is required. All calculations are purely numerical.

You can verify that the required packages are available by running:

```bash
python3 -c "import numpy, matplotlib; print('OK')"
```

If you are working in the course environment (pixi or Docker), these packages are already installed.

> [!NOTE]
> This notebook does **not** require ROS 2, a camera, or any sensor hardware. It is a standalone numerical exercise.

## 2.2 Datasheet reference

The notebook is based on the **Allied Vision Manta G-235C** datasheet. A datasheet excerpt is embedded directly in the notebook (the *Allied Vision Manta G-235C — Datasheet Reference* table at the top of the exercises). No external file or lecture PDF is required — everything you need is inside the notebook.

---

# 3. System Parameters

The notebook uses the following fixed system resources. These represent a realistic embedded robotics setup.

| Resource | Value |
|---|---|
| Memory capacity | 10 GB |
| Communication bandwidth | 1 Gbps (gigabit per second) |

> [!IMPORTANT]
> Pay attention to unit conversions throughout the notebook.
> - Bandwidth is given in **bits** per second (Gbps), but image size is in **bytes**.
> - Memory is given in **gigabytes** (GB), where 1 GB = 10⁹ bytes.

---

# 4. Exercises

The notebook is divided into three main steps and a set of open experiments.

## 4.1 Step 1 — Image size per pixel format

You will compute the raw image size in bytes for three pixel formats:

| Format | Bit depth | Channels |
|---|---|---|
| Mono8 | 8 bits | 1 |
| Mono12 | 12 bits | 1 |
| RGB8 | 8 bits | 3 |

Fill in the formulas marked with `???` in the notebook.

## 4.2 Step 2 — Maximum transmittable frame rate

Using the computed image sizes and the 1 Gbps bandwidth, you will determine:

- the maximum frame rate the link can carry for each pixel format,
- which formats are **bandwidth-limited** and which are **sensor-limited**.

## 4.3 Step 3 — Maximum recording time

Using the 10 GB memory budget and the effective frame rates from Step 2, you will calculate how many minutes of footage you can store for each pixel format.

## 4.4 Experiments

After completing the three steps, the notebook includes three open experiments:

<details>
<summary>Experiment A — Halve the resolution</summary>

Change the resolution to 968 × 608 (half of each dimension, as achieved by binning or decimation) and recalculate all values.

Answer:
1. By what factor does the image size decrease?
2. By what factor does the maximum frame rate increase?
3. By what factor does the maximum recording time increase?
4. Is this always a good trade-off for a robotics application?

</details>

<details>
<summary>Experiment B — JPEG compression</summary>

Assume JPEG compression achieves a 10:1 size reduction and recalculate.

Answer:
1. How does the recording time change?
2. What are the trade-offs of using lossy compression in a real-time robotics pipeline?

</details>

<details>
<summary>Experiment C — Design a 30-minute mission</summary>

Design a continuous RGB8 recording mission that lasts 30 minutes within the 10 GB memory constraint.

Answer:
1. How much storage is needed at maximum frame rate?
2. What sustained frame rate fits within 10 GB over 30 minutes?
3. What strategies other than reducing frame rate could help?

</details>

---

# 5. Troubleshooting

- **`ModuleNotFoundError: No module named 'numpy'`**

    Install the missing package:
    ```bash
    pip install numpy matplotlib
    ```

- **Sanity check assertion fails**

    Re-read the formula in the relevant section. Common mistakes are forgetting to convert bits to bytes (divide by 8), or confusing GB (10⁹ bytes) with GiB (2³⁰ bytes). The notebook uses 1 GB = 10⁹ bytes throughout.

- **The chart does not appear**

    Make sure you are running the notebook in a Jupyter environment (JupyterLab, Jupyter Notebook, or VS Code with the Jupyter extension). If the chart still does not appear, add `%matplotlib inline` at the top of the imports cell and re-run.

---

# References

- Lecture slides: *Practical Topics in Spatial AI*, Reza Sabzevari, TU Delft AE4ASM527
- Allied Vision Manta G-235 datasheet: https://www.alliedvision.com/en/camera-selector/detail/manta/g-235/
- Allied Vision bandwidth calculator: https://www.alliedvision.com/en/support/bandwidth-calculator/
