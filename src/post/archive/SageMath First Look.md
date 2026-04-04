---
title: "SageMath First Look"
categories: [Math, Code]
---

<https://sagecell.sagemath.org/>

<https://doc.sagemath.org/html/en/tutorial/tour_assignment.html>

``` python
# define variables
x, b, c = var('x b c')

# solve equations
solve([x^2 + b*x + c == 0], x) 
solve([x+y==6, x-y==4], x, y)

# differentiate
u = var('u')
diff(sin(u), u)

# 4-th derivative
diff(sin(x^2), x, 4)

# partial
x, y = var('x,y')
f = x^2 + 17*y^2

f.diff(x) # w.r.t. x
f.diff(y) # w.r.t. y

# partial fraction decomposition
f = 1/((1+x)*(x-1))
f.partial_fraction(x)

# indefnite integral
integral(x*sin(x^2), x)
# definite integral
integral(x/(x^2+1), x, 0, 1)

# solve DEs
t = var('t')    # define a variable t
x = function('x')(t)   # define x to be a function of t
DE = diff(x, t) + x - 1
desolve(DE, [x,t])

# lapalce transform
s = var("s")
t = var("t")
f = t^2*exp(t) - sin(t)
f.laplace(t,s)

# LaTeX
latex(sqrt(z^2 + 1/2)) # \sqrt{z^{2} + \frac{1}{2}}

# print
print("Hello World")
```
