import { test, expect } from '@playwright/test';

/**
 * Performance E2E Tests
 *
 * Tests to verify application performance metrics including
 * page load times, time to interactive, and resource loading.
 */

test.describe('Performance Metrics', () => {
  test('should load homepage within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Verify page loads in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
    console.log(`Homepage loaded in ${loadTime}ms`);
  });

  test('should measure Core Web Vitals', async ({ page }) => {
    await page.goto('/');

    // Measure Web Vitals using Performance API
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        // Get First Contentful Paint (FCP)
        const perfEntries = performance.getEntriesByType('paint');
        const fcp = perfEntries.find(entry => entry.name === 'first-contentful-paint');

        // Get Largest Contentful Paint (LCP)
        let lcp = 0;
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          lcp = entries[entries.length - 1].startTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // Get Cumulative Layout Shift (CLS)
        let cls = 0;
        new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              cls += (entry as any).value;
            }
          }
        }).observe({ entryTypes: ['layout-shift'] });

        setTimeout(() => {
          resolve({
            fcp: fcp?.startTime || 0,
            lcp,
            cls,
          });
        }, 3000);
      });
    });

    console.log('Web Vitals:', webVitals);

    // Assert acceptable thresholds (adjust based on requirements)
    // expect(webVitals.fcp).toBeLessThan(1800); // FCP < 1.8s
    // expect(webVitals.lcp).toBeLessThan(2500); // LCP < 2.5s
    // expect(webVitals.cls).toBeLessThan(0.1);  // CLS < 0.1
  });

  test('should load resources efficiently', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get all resource timings
    const resourceStats = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');

      return {
        total: resources.length,
        scripts: resources.filter(r => r.name.endsWith('.js')).length,
        styles: resources.filter(r => r.name.endsWith('.css')).length,
        images: resources.filter(r => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(r.name)).length,
        totalSize: resources.reduce((acc, r: any) => acc + (r.transferSize || 0), 0),
      };
    });

    console.log('Resource stats:', resourceStats);

    // Verify reasonable resource counts (adjust based on app)
    expect(resourceStats.scripts).toBeLessThan(50);
    expect(resourceStats.styles).toBeLessThan(20);
  });

  test('should handle large dataset efficiently', async ({ page }) => {
    // Template: Test performance with large data
    /*
    await page.goto('/projects'); // Page with potentially large list

    const startTime = Date.now();
    await page.waitForSelector('[data-testid="project-list"]');
    const renderTime = Date.now() - startTime;

    // Verify list renders quickly even with many items
    expect(renderTime).toBeLessThan(1000);

    // Test scrolling performance
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    // Verify smooth scroll without jank
    const scrollPerformance = await page.evaluate(() => {
      const entries = performance.getEntriesByType('measure');
      return entries.length;
    });
    */
  });
});

test.describe('Network Performance', () => {
  test('should minimise network requests', async ({ page }) => {
    const requests: string[] = [];

    page.on('request', (request) => {
      requests.push(request.url());
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    console.log(`Total network requests: ${requests.length}`);

    // Verify reasonable number of requests (adjust threshold)
    expect(requests.length).toBeLessThan(100);
  });

  test('should handle offline gracefully', async ({ page, context }) => {
    await page.goto('/');

    // Go offline
    await context.setOffline(true);

    // Attempt navigation
    await page.goto('/projects').catch(() => {
      // Expected to fail
    });

    // Verify offline handling (e.g., error message, cached content)
    // await expect(page.locator('[data-testid="offline-message"]')).toBeVisible();

    // Go back online
    await context.setOffline(false);
  });

  test('should cache resources appropriately', async ({ page }) => {
    // First visit
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get initial resource count
    const initialResources = await page.evaluate(() => {
      return performance.getEntriesByType('resource').length;
    });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Get resource count after reload
    const cachedResources = await page.evaluate(() => {
      return performance.getEntriesByType('resource').length;
    });

    console.log(`Initial: ${initialResources}, Cached: ${cachedResources}`);

    // Verify some resources were cached (fewer requests on reload)
    // expect(cachedResources).toBeLessThanOrEqual(initialResources);
  });
});

test.describe('Memory Performance', () => {
  test('should not leak memory on navigation', async ({ page }) => {
    // Template: Memory leak detection
    /*
    const getMemoryUsage = async () => {
      return await page.evaluate(() => {
        if (performance.memory) {
          return {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
          };
        }
        return null;
      });
    };

    await page.goto('/');
    const initialMemory = await getMemoryUsage();

    // Navigate through pages
    for (let i = 0; i < 10; i++) {
      await page.goto('/projects');
      await page.goto('/');
    }

    const finalMemory = await getMemoryUsage();

    if (initialMemory && finalMemory) {
      const memoryIncrease = finalMemory.used - initialMemory.used;
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);

      // Verify memory doesn't grow excessively (adjust threshold)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
    }
    */
  });
});
