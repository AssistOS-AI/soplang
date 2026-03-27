async function loadPartial(targetSelector, partialPath) {
    const target = document.querySelector(targetSelector);
    if (!target) {
        return null;
    }
    try {
        const response = await fetch(partialPath, { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error(`Failed to fetch ${partialPath}: ${response.status}`);
        }
        const html = await response.text();
        target.innerHTML = html;
        return target;
    } catch (error) {
        console.error('Partial load error:', error);
        return null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    (async () => {
        const headerTarget = await loadPartial('#site-header', 'partials/header.html');
        if (headerTarget) {
            enhancePageHeader(headerTarget);
        }
    })();
    loadPartial('#site-footer', 'partials/footer.html');
});

function enhancePageHeader(container) {
    let breadcrumbs = [];
    if (container.dataset.breadcrumb) {
        try {
            breadcrumbs = JSON.parse(container.dataset.breadcrumb).map((entry) => ({
                label: (entry.label ?? '').trim(),
                href: entry.href ? entry.href.trim() : undefined,
            })).filter((entry) => entry.label);
        } catch (error) {
            console.warn('Invalid breadcrumb data:', error);
            breadcrumbs = [];
        }
    }

    const banner = container.querySelector('.site-banner');
    const breadcrumbNav = banner?.querySelector('.page-breadcrumb');
    if (!banner || !breadcrumbNav) {
        return;
    }

    breadcrumbNav.innerHTML = '';

    if (breadcrumbs.length) {
        breadcrumbs.forEach((crumb, index) => {
            if (index > 0) {
                const separator = document.createElement('span');
                separator.className = 'page-breadcrumb__separator';
                separator.textContent = '>';
                breadcrumbNav.appendChild(separator);
            }

            if (crumb.href) {
                const link = document.createElement('a');
                link.href = crumb.href;
                link.textContent = crumb.label;
                breadcrumbNav.appendChild(link);
            } else {
                const current = document.createElement('span');
                current.className = 'page-breadcrumb__current';
                current.textContent = crumb.label;
                breadcrumbNav.appendChild(current);
            }
        });
    } else {
        breadcrumbNav.remove();
    }
}
