# 3D Scene to 2D Image: Camera Projection Exercise

This notebook recaps the camera geometry fundamentals introduced in the lecture and guides you through the mathematics of perspective projection step by step. Starting from physical sensor and lens parameters, you will build the calibration matrix **K** from scratch, compute the field of view, and project a 3D point onto the image plane — the same operations a real camera performs every time it captures a frame.

In this notebook, you will:

1. Derive the image resolution from sensor size and pixel pitch.
2. Compute the focal length in millimetres from the horizontal field of view.
3. Convert the focal length to pixels and assemble the calibration matrix **K**.
4. Calculate the vertical field of view from the sensor geometry.
5. Project a 3D camera-frame point onto the image using the perspective projection equation.
6. Verify all results against expected values using built-in sanity checks.

<details>

<summary>Related lecture material</summary>

This notebook connects directly to the following topics from the *Practical Topics in Spatial AI* lecture:

- The pinhole camera model and perspective projection
- The calibration matrix K and its intrinsic parameters
- Focal length in millimetres and in pixels
- Field of view and the thin-lens equation
- The perspective projection equation: $\lambda [u, v, 1]^T = K [R \mid t] P_W$

</details>

## Table of Contents

1. [Recap](#1-recap)
2. [Requirements](#2-requirements)
3. [Camera Specifications](#3-camera-specifications)
4. [Exercises](#4-exercises)
5. [Troubleshooting](#5-troubleshooting)
6. [References](#6-references)


# 1. Recap

## 1.1 From 3D world to 2D pixel

A camera maps a 3D scene point onto a 2D image through a two-step process:

```text
World point P_W  →  [R | t]  →  Camera point P_C  →  K  →  Pixel (u, v)
```

- **[R | t]** is the *extrinsic* matrix: the position and orientation of the camera in the world.
- **K** is the *intrinsic* (calibration) matrix: the internal geometry of the camera.

The combined perspective projection equation is:

$$
\lambda \begin{bmatrix} u \\ v \\ 1 \end{bmatrix}
= K \begin{bmatrix} R & t \end{bmatrix}
\begin{bmatrix} X_W \\ Y_W \\ Z_W \\ 1 \end{bmatrix}
$$

where $\lambda = Z_C$ is the depth of the point in the camera frame.

## 1.2 The calibration matrix K

$$
K = \begin{bmatrix} a_u & 0 & u_0 \\ 0 & a_v & v_0 \\ 0 & 0 & 1 \end{bmatrix}
$$

| Symbol | Meaning |
|---|---|
| $a_u = k_u f$ | Focal length in pixels, horizontal |
| $a_v = k_v f$ | Focal length in pixels, vertical |
| $u_0$ | Horizontal pixel coordinate of the principal point |
| $v_0$ | Vertical pixel coordinate of the principal point |
| $k_u$, $k_v$ | Pixel density (pixels per mm) — inverse of pixel pitch |
| $f$ | Focal length in mm |

## 1.3 Focal length in pixels

The pixel pitch $p$ is the physical distance between adjacent pixel centres (in mm):

$$
f_{\text{pixels}} = \frac{f_{\text{mm}}}{p}
$$

## 1.4 Field of view

The horizontal field of view is related to the sensor width $W$ and focal length $f$ by:

$$
\text{FoV}_H = 2 \arctan\left(\frac{W}{2f}\right)
\quad \Leftrightarrow \quad
f = \frac{W}{2 \tan\left(\frac{\text{FoV}_H}{2}\right)}
$$

The same formula applies vertically using the sensor height $H$.

---

# 2. Requirements

## 2.1 Python dependencies

This notebook requires:

- Python 3
- NumPy
- Matplotlib

No hardware, no camera, and no ROS are required. All computations are purely mathematical.

You can verify that the required packages are available by running:

```bash
python3 -c "import numpy, matplotlib; print('OK')"
```

If you are working in the course environment (pixi or Docker), these packages are already installed.

> [!NOTE]
> It is strongly recommended to work through each step on paper first before filling in the code. The notebook is designed to verify your hand calculations, not replace them.

## 2.2 Background knowledge

Before starting, make sure you are comfortable with:

- the thin-lens / pinhole camera model from the lecture,
- basic trigonometry (`arctan`, `tan`),
- matrix multiplication in NumPy.

---

# 3. Camera Specifications

The exercise uses the following hypothetical camera. All values are given in the notebook and do not need to be looked up.

| Parameter | Value |
|---|---|
| Lens horizontal FoV | 90° |
| Sensor size | Full-frame: 36 mm × 24 mm |
| Total resolution | 6 MP |
| Pixel size (pitch) | 12 µm (square pixels) |

> [!IMPORTANT]
> The pixel pitch is given in **micrometres** (µm). You must convert it to millimetres before using it in the focal-length formula. 1 µm = 10⁻³ mm.

---

# 4. Exercises

The notebook is divided into three sub-problems and a set of open experiments.

## 4.1 Step 1 — Calibration matrix K

This step has four parts that build on each other. Work through them in order.

**Part 1 — Image resolution**

Compute the number of pixels horizontally ($N_u$) and vertically ($N_v$) from the sensor size and pixel pitch:

$$
N_u = \frac{\text{sensor width (mm)}}{\text{pixel pitch (mm)}}, \qquad N_v = \frac{\text{sensor height (mm)}}{\text{pixel pitch (mm)}}
$$

**Part 2 — Focal length in mm**

Use the horizontal FoV formula to find $f$:

$$
f = \frac{W}{2 \tan\left(\frac{\text{FoV}_H}{2}\right)}
$$

**Part 3 — Focal length in pixels**

Convert $f$ from mm to pixels:

$$
a_u = a_v = \frac{f_{\text{mm}}}{p}
$$

**Part 4 — Assemble K**

Place $a_u$, $a_v$, $u_0 = N_u / 2$, and $v_0 = N_v / 2$ into the 3×3 matrix.

## 4.2 Step 2 — Vertical field of view

Apply the FoV formula using the sensor **height** instead of width:

$$
\text{FoV}_V = 2 \arctan\left(\frac{H}{2f}\right)
$$

Check that the result is smaller than 90°. A full-frame sensor is 36 × 24 mm (3:2 aspect ratio), so the vertical FoV must always be narrower than the horizontal FoV.

## 4.3 Step 3 — Project a 3D point

Project the camera-frame point $P_C = [1, 1, 2]^T$ onto the image:

$$
\lambda \begin{bmatrix} u \\ v \\ 1 \end{bmatrix} = K \begin{bmatrix} X_C \\ Y_C \\ Z_C \end{bmatrix}
\quad \Rightarrow \quad
u = u_0 + a_u \frac{X_C}{Z_C}, \quad v = v_0 + a_v \frac{Y_C}{Z_C}
$$

After computing the result, check whether the projected pixel falls inside the image bounds.

## 4.4 Experiments

After completing the three steps, the notebook includes open experiments to deepen your understanding:

<details>
<summary>Experiment A — Change the field of view</summary>

Change `fov_h_deg` to 50° (a more typical telephoto lens) and re-run all cells.

Answer:
1. How does the focal length change?
2. How does the projected position of $P_C = [1, 1, 2]^T$ change?
3. Why does a longer focal length make objects appear larger in the image?

</details>

<details>
<summary>Experiment B — Move the point closer</summary>

Change $P_C$ from `[1, 1, 2]` to `[1, 1, 0.5]` (four times closer).

Answer:
1. How much does the projected pixel move?
2. Is the relationship between depth and pixel displacement linear or non-linear?
3. What happens if $Z_C = 0$? Why is this a problem?

</details>

<details>
<summary>Experiment C — Off-axis points</summary>

Project these three points and mark all of them on the visualisation:

```python
P1 = [0, 0, 2]   # on the optical axis
P2 = [1, 0, 2]   # shifted right
P3 = [0, 1, 2]   # shifted down
```

Answer:
1. Where does P1 project? It should land exactly at the principal point.
2. Does shifting X by +1 m move the pixel left or right in the image?
3. Why does the image have a flipped orientation compared to the scene?

</details>

---

# 5. Troubleshooting

- **Sanity check fails for the focal length**

    Make sure you converted the FoV from degrees to radians before calling `np.tan`. Use `np.deg2rad(fov_h_deg)`.

- **Sanity check fails for the image resolution**

    Check that you are dividing sensor size in **mm** by pixel pitch in **mm**. If you use µm for both, the result will be the same, but mixing units (mm and µm) will give a result that is 1000× too large or too small.

- **Projected pixel is outside the image bounds**

    Re-check your $u_0$ and $v_0$ values. The principal point should be at the image centre: $u_0 = N_u / 2$, $v_0 = N_v / 2$. Also verify the sign and order of $X_C$, $Y_C$, $Z_C$ in $P_C$.

- **The visualisation axes look wrong**

    The notebook calls `ax.invert_yaxis()` because image coordinates have $v$ increasing downward. This is correct behaviour, not a bug.

---

# References

- Lecture slides: *Practical Topics in Spatial AI*, Reza Sabzevari, TU Delft AE4ASM527
- Hartley & Zisserman, *Multiple View Geometry in Computer Vision*, Cambridge University Press
- OpenCV camera calibration documentation: https://docs.opencv.org/4.x/dc/dbb/tutorial_py_calibration.html
